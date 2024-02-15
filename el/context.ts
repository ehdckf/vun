import type { HTTPStatusName } from "./utils";
import { Cookie, type CookieOptions } from "./cookie";

type WithoutNullableKeys<Type> = {
        [Key in keyof Type]-?: NonNullable<Type[Key]>;
};

import type { DecoratorBase, RouteSchema, Prettify, GetPathParameter } from "./types";

export type Context<
        Route extends RouteSchema = RouteSchema,
        Decorators extends DecoratorBase = { request: {}; store: {}; derive: {}; resolve: {} },
        Path extends string = "",
> = Prettify<
        {
                body: Route["body"];
                query: undefined extends Route["query"] ? Record<string, string | undefined> : Route["query"];
                params: undefined extends Route["params"]
                        ? Path extends `${string}/${":" | "*"}${string}`
                                ? Record<GetPathParameter<Path>, string>
                                : never
                        : Route["params"];
                headers: undefined extends Route["headers"] ? Record<string, string | undefined> : Route["headers"];
                cookie: undefined extends Route["cookie"]
                        ? Record<string, Cookie<any>>
                        : Record<string, Cookie<any>> &
                                  WithoutNullableKeys<{ [Key in keyof Route["cookie"]]: Cookie<Route["cookie"][Key]> }>;

                set: {
                        headers: Record<string, string> & { "Set-Cookie"?: string | string[] };
                        status?: number | HTTPStatusName;
                        redirect?: string;
                        cookie?: Record<string, Prettify<{ value: string } & CookieOptions>>;
                };
                path: string;
                request: Request;
                store: Decorators["store"];
        } & Decorators["request"] &
                Decorators["derive"] &
                Decorators["resolve"]
>;

export type PreContext<
        Decorators extends DecoratorBase = {
                request: {};
                store: {};
                derive: {};
                resolve: {};
        },
> = Prettify<{
        store: Decorators["store"];
        request: Request;
        set: {
                headers: Record<string, string> & { "Set-Cookie"?: string | string[] };
                status?: number;
                redirect?: string;
        };
}>;
