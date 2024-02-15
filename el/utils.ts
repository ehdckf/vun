const isObject = (item: any): item is Object => item && typeof item === "object" && !Array.isArray(item);

export const isNumericString = (message: string): boolean => {
        if (message.length < 16) {
                return message.trim().length !== 0 && !Number.isNaN(Number(message));
        }

        if (message.length === 16) {
                const numVal = Number(message);
                if (numVal.toString() === message) return message.trim().length !== 0 && !Number.isNaN(numVal);
        }
        return false;
};

export const signCookie = async (val: string, secret: string | null) => {
        if (typeof val !== "string") throw new TypeError("Cookie value must be provided as a string");
        if (secret === null) throw new TypeError("Secret key must be provided");

        const encoder = new TextEncoder();
        const secretKey = await crypto.subtle.importKey(
                "raw",
                encoder.encode(secret),
                { name: "HMAC", hash: "SHA-256" },
                false,
                ["sign"],
        );
        const hmacBuffer = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(val));
        const hmacArray = Array.from(new Uint8Array(hmacBuffer));
        const digest = btoa(String.fromCharCode(...hmacArray));
        return `${val}.${digest.replace(/=+$/, "")}`;
};

export const unsignCookie = async (input: string, secret: string | null) => {
        if (typeof input !== "string") throw new TypeError("Signed cookie string must be provided.");
        if (secret === null) throw new TypeError("Secret key must be provided");

        const tentativeValue = input.slice(0, input.lastIndexOf("."));
        const expectedInput = await signCookie(tentativeValue, secret);
        return expectedInput === input ? tentativeValue : false;
};

export const replaceUrlPath = (url: string, pathname: string) => {
        const urlObject = new URL(url);
        urlObject.pathname = pathname;
        return urlObject.toString();
};

const isClass = (v: Object) => {
        return (
                (typeof v === "function" && /^\s*class\s+/.test(v.toString())) ||
                v.toString().startsWith("[object ") ||
                isNotEmpty(Object.getPrototypeOf(v))
        );
};

export const isNotEmpty = (obj: Object) => {
        for (const x in obj) return true;
        return false;
};

export const mergeDeep = <const A extends Record<string, any>, const B extends Record<string, any>>(
        target: A,
        source: B,
        {
                skipKeys,
        }: {
                skipKeys?: string[];
        } = {},
): A & B => {
        if (isObject(target) && isObject(source))
                for (const [key, value] of Object.entries(source)) {
                        if (skipKeys?.includes(key)) continue;

                        if (!isObject(value)) {
                                target[key as keyof typeof target] = value;
                                continue;
                        }

                        if (!(key in target)) {
                                target[key as keyof typeof target] = value;
                                continue;
                        }

                        if (isClass(value)) {
                                target[key as keyof typeof target] = value;
                                continue;
                        }

                        target[key as keyof typeof target] = mergeDeep((target as any)[key] as any, value);
                }

        return target as A & B;
};

export const mergeCookie = <const A extends Object, const B extends Object>(target: A, source: B): A & B =>
        mergeDeep(target, source, {
                skipKeys: ["properties"],
        });

export const mergeObjectArray = <T>(a: T | T[], b: T | T[]): T[] => {
        if (!a) return [];

        // ! Must copy to remove side-effect
        const array = [...(Array.isArray(a) ? a : [a])];
        const checksums = [];

        for (const item of array) {
                // @ts-ignore
                if (item.checksums)
                        // @ts-ignore
                        checksums.push(item.checksums);
        }

        for (const item of Array.isArray(b) ? b : [b]) {
                // @ts-ignore
                if (!checksums.includes(item?.checksums)) {
                        array.push(item);
                }
        }

        return array;
};

export const StatusMap = {
        Continue: 100,
        "Switching Protocols": 101,
        Processing: 102,
        "Early Hints": 103,
        OK: 200,
        Created: 201,
        Accepted: 202,
        "Non-Authoritative Information": 203,
        "No Content": 204,
        "Reset Content": 205,
        "Partial Content": 206,
        "Multi-Status": 207,
        "Already Reported": 208,
        "Multiple Choices": 300,
        "Moved Permanently": 301,
        Found: 302,
        "See Other": 303,
        "Not Modified": 304,
        "Temporary Redirect": 307,
        "Permanent Redirect": 308,
        "Bad Request": 400,
        Unauthorized: 401,
        "Payment Required": 402,
        Forbidden: 403,
        "Not Found": 404,
        "Method Not Allowed": 405,
        "Not Acceptable": 406,
        "Proxy Authentication Required": 407,
        "Request Timeout": 408,
        Conflict: 409,
        Gone: 410,
        "Length Required": 411,
        "Precondition Failed": 412,
        "Payload Too Large": 413,
        "URI Too Long": 414,
        "Unsupported Media Type": 415,
        "Range Not Satisfiable": 416,
        "Expectation Failed": 417,
        "I'm a teapot": 418,
        "Misdirected Request": 421,
        "Unprocessable Content": 422,
        Locked: 423,
        "Failed Dependency": 424,
        "Too Early": 425,
        "Upgrade Required": 426,
        "Precondition Required": 428,
        "Too Many Requests": 429,
        "Request Header Fields Too Large": 431,
        "Unavailable For Legal Reasons": 451,
        "Internal Server Error": 500,
        "Not Implemented": 501,
        "Bad Gateway": 502,
        "Service Unavailable": 503,
        "Gateway Timeout": 504,
        "HTTP Version Not Supported": 505,
        "Variant Also Negotiates": 506,
        "Insufficient Storage": 507,
        "Loop Detected": 508,
        "Not Extended": 510,
        "Network Authentication Required": 511,
} as const;

export type HTTPStatusName = keyof typeof StatusMap;
