import bodyParser from "body-parser";
import type { Express, Request, Response } from "express";
import https from "https";

import { Config } from "./config";
import { debounce } from "./debouncer";
import type { Desk } from "./desk";
import { Height, Speed, debugLog, type HeightAndSpeed } from "./util";

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

  constructor(
    private readonly config: Config,
    app: Express,
    private readonly desk: Desk,
  ) {
    const jsonParser = bodyParser.json();
    const textParser = bodyParser.text();

    app.get("/rest/desk", this.getDesk.bind(this));
    app.post("/rest/desk", jsonParser, this.postDesk.bind(this));
    app.get("/rest/desk/height", this.getDeskHeight.bind(this));
    app.post("/rest/desk/height", textParser, this.postDeskHeight.bind(this));
    app.get("/rest/desk/speed", this.getDeskSpeed.bind(this));

    if (config.webhookPutHeight) {
      const webhookUrl = new URL(config.webhookPutHeight);
      this.webhookPutHeightOptions = {
        hostname: webhookUrl.hostname,
        port: webhookUrl.port || 443,
        path: webhookUrl.pathname + webhookUrl.search,
        method: "PUT",
        headers: config.webhookPutHeightHeaders
          ? JSON.parse(config.webhookPutHeightHeaders)
          : undefined,
      };
    }

    const callback = (heightAndSpeed: HeightAndSpeed) => {
      this.currentHnS = heightAndSpeed;

      if (this.webhookPutHeightOptions) {
        debounce("webhookPutHeight", 1000).then((shouldExecute) => {
          if (shouldExecute && this.webhookPutHeightOptions) {
            debugLog(config, "Executing webhook...");
            const req = https.request(this.webhookPutHeightOptions);
            req.write(heightAndSpeed.height.human.toString());
            req.end();
          }
        });
      }
    };

    // fetch initial values:
    desk
      .getHeightSpeed()
      .then(
        (heightAndSpeed: HeightAndSpeed) => (this.currentHnS = heightAndSpeed),
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
    response: Response,
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
    if (targetHeightNumber > this.config.maxHeight) {
      response.sendStatus(422);
      return;
    }

    const height = new Height(targetHeightNumber, this.config, true);
    console.log(`Moving to height of ${height.human}mm`);
    this.desk.moveTo(height);

    response.sendStatus(202);
  }
}
