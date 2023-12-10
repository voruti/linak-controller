import { Express, Request, Response } from "express";
import bodyParser from "body-parser";
import noble from "@abandonware/noble";

import { Desk } from "./desk";
import { Height, HeightAndSpeed, Speed, debugLog } from "./util";
import { Config } from "./config";

export interface DeskDTO {
    height: number;
    speed: number;
}

export class RestApi {
    private currentHnS: HeightAndSpeed = {
        height: new Height(0, new Config()),
        speed: new Speed(0),
    };

    constructor(
        private config: Config,
        app: Express,
        private characteristics: noble.Characteristic[]
    ) {
        const jsonParser = bodyParser.json();
        const textParser = bodyParser.text();

        app.get("/rest/desk", this.getDesk.bind(this));
        app.post("/rest/desk", jsonParser, this.postDesk.bind(this));
        app.get("/rest/desk/height", this.getDeskHeight.bind(this));
        app.post(
            "/rest/desk/height",
            textParser,
            this.postDeskHeight.bind(this)
        );
        app.get("/rest/desk/speed", this.getDeskSpeed.bind(this));

        const callback = (heightAndSpeed: HeightAndSpeed) => {
            this.currentHnS = heightAndSpeed;
        };

        // fetch initial values:
        Desk.getHeightSpeed(characteristics, config).then(
            (heightAndSpeed: HeightAndSpeed) =>
                (this.currentHnS = heightAndSpeed)
        );

        Desk.watchHeightSpeed(characteristics, config, callback.bind(this));
    }

    private getDesk(_: Request, response: Response): void {
        response.json({
            height: this.currentHnS.height.human,
            speed: this.currentHnS.speed.human,
        });
    }

    private postDesk(request: Request, response: Response): void {
        debugLog(this.config, "postDesk with", request.body);
        if (!request.body?.height) {
            response.sendStatus(400);
            return;
        }

        this.commonPostHeight(request.body.height, response);
    }

    private getDeskHeight(_: Request, response: Response): void {
        response.send(this.currentHnS.height.human.toString());
    }

    private postDeskHeight(request: Request, response: Response): void {
        debugLog(this.config, "postDeskHeight with", request.body);
        if (!request.body) {
            response.sendStatus(400);
            return;
        }

        this.commonPostHeight(request.body, response);
    }

    private getDeskSpeed(_: Request, response: Response): void {
        response.send(this.currentHnS.speed.human.toString());
    }

    private commonPostHeight(
        targetHeight: number | string,
        response: Response
    ): void {
        let targetHeightNumber: number;
        try {
            targetHeightNumber = parseFloat(targetHeight.toString());

            if (isNaN(targetHeightNumber)) {
                throw new Error();
            }
        } catch {
            response.sendStatus(400);
            return;
        }

        if (targetHeightNumber < this.config.baseHeight) {
            response.sendStatus(422);
            return;
        }

        Desk.moveTo(
            this.characteristics,
            new Height(targetHeightNumber, this.config, true),
            this.config
        );

        response.sendStatus(202);
    }
}
