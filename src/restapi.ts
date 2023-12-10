import { Express, Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import noble from "@abandonware/noble";

import { Desk } from "./desk";
import { Height, HeightAndSpeed, Speed } from "./util";
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
        app.get("/rest/desk", this.getDesk.bind(this));
        app.post("/rest/desk", this.postDesk.bind(this));
        app.get("/rest/desk/height", this.getDeskHeight.bind(this));
        app.post("/rest/desk/height", this.postDeskHeight.bind(this));
        app.get("/rest/desk/speed", this.getDeskSpeed.bind(this));

        const callback = (heightAndSpeed: HeightAndSpeed) => {
            this.currentHnS = heightAndSpeed;
        };

        // fetch initial values:
        Desk.getHeightSpeed(characteristics, config).then(
            (heightAndSpeed: HeightAndSpeed) =>
                (this.currentHnS = heightAndSpeed)
        );

        Desk.watchHeightSpeed(characteristics, config); // TODO: add callback
    }

    private getDesk(_: Request, response: Response<DeskDTO>): void {
        response.json({
            height: this.currentHnS.height.human,
            speed: this.currentHnS.speed.human,
        });
    }

    private postDesk(
        request: Request<ParamsDictionary, any, DeskDTO>,
        response: Response
    ): void {
        if (!request.body) {
            response.sendStatus(400);
            return;
        }

        this.commonPostHeight(request.body.height, response);
    }

    private getDeskHeight(_: Request, response: Response<number>): void {
        response.send(this.currentHnS.height.human);
    }

    private postDeskHeight(
        request: Request<ParamsDictionary, any, number>,
        response: Response
    ): void {
        if (!request.body) {
            response.sendStatus(400);
            return;
        }

        this.commonPostHeight(request.body, response);
    }

    private getDeskSpeed(_: Request, response: Response<number>): void {
        response.send(this.currentHnS.speed.human);
    }

    private commonPostHeight(targetHeight: number, response: Response): void {
        if (isNaN(targetHeight)) {
            response.sendStatus(400);
            return;
        }

        if (targetHeight < this.config.baseHeight) {
            response.sendStatus(422);
            return;
        }

        Desk.moveTo(
            this.characteristics,
            new Height(targetHeight, this.config, true),
            this.config
        );

        response.sendStatus(202);
    }
}
