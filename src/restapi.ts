import { Express, Request, Response } from "express";
import bodyParser from "body-parser";
import https from "https";

import { Desk } from "./desk";
import { Height, HeightAndSpeed, Speed, debugLog } from "./util";
import { Config } from "./config";
import { debounce } from "./debouncer";

export interface DeskDTO {
    height: number;
    speed: number;
}

export class RestApi {
    private readonly webhookPutHeightOptions?: https.RequestOptions;

    private currentHnS: HeightAndSpeed = {
        height: new Height(0, new Config()),
        speed: new Speed(0),
    };

    constructor(private config: Config, app: Express, private desk: Desk) {
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

        if (config.webhookPutHeight) {
            const webhookUrl = new URL(config.webhookPutHeight);
            this.webhookPutHeightOptions = {
                hostname: webhookUrl.hostname,
                port: webhookUrl.port || 443,
                path: webhookUrl.pathname + webhookUrl.search,
                method: "PUT",
            };
        }

        const callback = (heightAndSpeed: HeightAndSpeed) => {
            this.currentHnS = heightAndSpeed;

            if (this.webhookPutHeightOptions) {
                debounce("webhookPutHeight", 1000).then((shouldExecute) => {
                    if (shouldExecute && this.webhookPutHeightOptions) {
                        debugLog(config, "Executing webhook...");
                        const req = https.request(
                            this.webhookPutHeightOptions,
                            (res) => {
                                let responseData = "";

                                res.on("data", (chunk) => {
                                    responseData += chunk;
                                });

                                res.on("end", () => {
                                    console.log("Response:", responseData);
                                });
                            }
                        );

                        req.on("error", (error) => {
                            console.error("Error:", error.message);
                        });

                        req.write(heightAndSpeed.height.human.toString());
                        req.end();
                    }
                });
            }
        };

        // fetch initial values:
        desk.getHeightSpeed().then(
            (heightAndSpeed: HeightAndSpeed) =>
                (this.currentHnS = heightAndSpeed)
        );

        desk.watchHeightSpeed(callback.bind(this));
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

        this.desk.moveTo(new Height(targetHeightNumber, this.config, true));

        response.sendStatus(202);
    }
}
