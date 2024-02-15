import { parse } from "cookie";
import { isNumericString, unsignCookie } from "./utils";
import { InvalidCookieSignature } from "./error";
import type { Context } from "./context";

export interface CookieOptions {
        domain?: string | undefined;
        expires?: Date | undefined;
        httpOnly?: boolean | undefined;
        maxAge?: number | undefined;
        path?: string | undefined;
        priority?: "low" | "medium" | "high" | undefined;
        sameSite?: true | false | "lax" | "strict" | "none" | undefined;
        secure?: boolean | undefined;
        secrets?: string | string[];
}

type MutateCookie<T = unknown> = CookieOptions & {
        value?: T;
} extends infer A
        ? A | ((previous: A) => A)
        : never;

type CookieJar = Record<string, Cookie>;

export class Cookie<T = unknown> implements CookieOptions {
        public name: string | undefined;
        private setter: Context["set"] | undefined; // context
        constructor(private _value: T, public property: Readonly<CookieOptions> = {}) {}

        get() {
                return this._value;
        }

        get value(): T {
                return this._value as any;
        }

        set value(value: T) {
                if (typeof value === "object") {
                        if (JSON.stringify(this.value) === JSON.stringify(value)) return;
                } else if (this.value === value) return;
                this._value = value as any;
                this.sync();
        }

        add<T>(config: MutateCookie<T>): Cookie<T> {
                const updated = Object.assign(
                        this.property,
                        typeof config === "function" ? config(Object.assign(this.property, this.value) as any) : config,
                );
                if ("value" in updated) {
                        this._value = updated.value as any;
                        delete updated.value;
                }
                this.property = updated;
                return this.sync() as any;
        }

        set<T>(config: MutateCookie): Cookie<T> {
                const updated =
                        typeof config === "function" ? config(Object.assign(this.property, this.value) as any) : config;

                if ("value" in updated) {
                        this._value = updated.value as any;
                        delete updated.value;
                }

                this.property = updated;
                return this.sync() as any;
        }

        remove(options?: Pick<CookieOptions, "domain" | "path" | "sameSite" | "secure">) {
                if (this.value === undefined) return;
                this.set({
                        domain: options?.domain,
                        expires: new Date(0),
                        maxAge: 0,
                        path: options?.path,
                        sameSite: options?.sameSite,
                        secure: options?.secure,
                        value: "" as any,
                });
        }

        get domain() {
                return this.property.domain;
        }

        set domain(value) {
                if (this.property.domain === value) return;
                // @ts-ignore
                this.property.domain = value;
                this.sync();
        }

        get expires() {
                return this.property.expires;
        }

        set expires(value) {
                if (this.property.expires?.getTime() === value?.getTime()) return;
                // @ts-ignore
                this.property.expires = value;
                this.sync();
        }

        get httpOnly() {
                return this.property.httpOnly;
        }

        set httpOnly(value) {
                // @ts-ignore
                if (this.property.domain === value) return;

                // @ts-ignore
                this.property.httpOnly = value;

                this.sync();
        }

        get maxAge() {
                return this.property.maxAge;
        }

        set maxAge(value) {
                // @ts-ignore
                if (this.property.maxAge === value) return;

                // @ts-ignore
                this.property.maxAge = value;

                this.sync();
        }

        get path() {
                return this.property.path;
        }

        set path(value) {
                // @ts-ignore
                if (this.property.path === value) return;

                // @ts-ignore
                this.property.path = value;

                this.sync();
        }

        get priority() {
                return this.property.priority;
        }

        set priority(value) {
                // @ts-ignore
                if (this.property.priority === value) return;

                // @ts-ignore
                this.property.priority = value;

                this.sync();
        }

        get sameSite() {
                return this.property.sameSite;
        }

        set sameSite(value) {
                // @ts-ignore
                if (this.property.sameSite === value) return;

                // @ts-ignore
                this.property.sameSite = value;

                this.sync();
        }

        get secure() {
                return this.property.secure;
        }

        set secure(value) {
                // @ts-ignore
                if (this.property.secure === value) return;

                // @ts-ignore
                this.property.secure = value;

                this.sync();
        }

        toString() {
                return typeof this.value === "object" ? JSON.stringify(this.value) : this.value?.toString() ?? "";
        }

        private sync() {
                if (!this.name || !this.setter) return this;
                if (!this.setter.cookie)
                        this.setter.cookie = {
                                [this.name]: Object.assign(this.property, { value: this.toString() }),
                        };
                else this.setter.cookie[this.name] = Object.assign(this.property, { value: this.toString() });

                return this;
        }
}

export const createCookieJar = (initial: CookieJar, set: any, properties?: CookieOptions) =>
        new Proxy(initial as CookieJar, {
                get(target, key: string) {
                        if (key in target) return target[key];
                        const cookie = new Cookie(undefined, properties ? { ...properties } : undefined);
                        //@ts-ignore
                        cookie.setter = set;
                        cookie.name = key;
                        return cookie;
                },
                set(target, key: string, value) {
                        if (!(value instanceof Cookie)) return false;
                        if (!set.cookie) set.cookie = {};
                        //@ts-ignore
                        value.setter = set;
                        value.name = key;
                        //@ts-ignore
                        value.sync();
                        target[key] = value;

                        return true;
                },
        });

export const parseCookie = async (
        set: Context["set"],
        cookieString?: string | null,
        {
                secret,
                sign,
                ...properties
        }: CookieOptions & { secret?: string | string[]; sign?: true | string | string[] } = {},
) => {
        if (!cookieString) return createCookieJar({}, set, properties);
        const jar: CookieJar = {};
        const isStringKey = typeof secret === "string";

        if (sign && sign !== true && !Array.isArray(sign)) sign = [sign];
        const cookieKeys = Object.keys(parse(cookieString));
        for (let i = 0; i < cookieKeys.length; i++) {
                const key = cookieKeys[i];
                let value = parse(cookieString)[key];
                if (sign === true || sign?.includes(key)) {
                        if (!secret) throw new Error("No secret is provided to cookie plugin");

                        if (isStringKey) {
                                //@ts-ignore
                                value = await unsignCookie(value as string, secret);
                                //@ts-ignore
                                if (value == false) throw new InvalidCookieSignature(key);
                        } else {
                                let fail = true;
                                for (let i = 0; i < secret.length; i++) {
                                        const temp = await unsignCookie(value as string, secret[i]);
                                        if (temp !== false) {
                                                value = temp;
                                                fail = true;
                                                break;
                                        }
                                }
                                if (fail) throw new InvalidCookieSignature(key);
                        }
                }

                if (value === undefined) continue;
                const start = (value as string).charCodeAt(0);
                if (start === 123 || start == 91) {
                        try {
                                const cookie = new Cookie(JSON.parse(value as string));

                                //@ts-ignore
                                cookie.setter = set;
                                cookie.name = key;
                                jar[key] = cookie;
                                continue;
                        } catch (err) {}
                }
                //@ts-ignore
                if (isNumericString(value)) value = +value;
                //@ts-ignore
                else if (value === "true") value = true;
                //@ts-ignore
                else if (value === "false") value = false;

                const cookie = new Cookie(value, properties);

                //@ts-ignore
                cookie.setter = set;
                cookie.name = key;
                jar[key] = cookie;
        }

        return createCookieJar(jar, set);
};
