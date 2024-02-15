import type { ServerWebSocket, WebSocketHandler } from "bun";
import type { TSchema } from "@sinclair/typebox";
import type { TypeCheck } from "@sinclair/typebox/compiler";
import type { ValidationError } from "../error";
import type { Context } from "../context";
import type { DecoratorBase, RouteSchema } from "../types";

export const websocket: WebSocketHandler<any> = {
        open(ws) {
                ws.data.open?.(ws);
        },
        message(ws, message) {
                ws.data.message?.(ws, message);
        },
        drain(ws) {
                ws.data.drain?.(ws);
        },
        close(ws, code, reason) {
                ws.data.close?.(ws, code, reason);
        },
};

export class PublicNodeWS<
        WS extends ServerWebSocket<{ id?: string; validator?: TypeCheck<TSchema> }>,
        Route extends RouteSchema = RouteSchema,
        Decorators extends DecoratorBase = {
                request: {};
                store: {};
                derive: {};
                resolve: {};
        },
> {
        validator?: TypeCheck<TSchema>;
        constructor(public raw: WS, public data: Context<Route, Decorators>) {
                this.validator = raw.data.validator;
        }
}
