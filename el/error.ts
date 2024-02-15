import { Value } from "@sinclair/typebox/value";
import type { TypeCheck } from "@sinclair/typebox/compiler";
import type { TSchema } from "@sinclair/typebox";

const env = typeof Bun !== "undefined" ? Bun.env : typeof process !== "undefined" ? process?.env : undefined;

export const isProduction = (env?.NODE_ENV ?? env?.ENV) === "production";

export class InvalidCookieSignature extends Error {
        code = "INVALID_COOKIE_SIGNATURE";
        status = 400;

        constructor(public key: string, message?: string) {
                super(message ?? `"${key}" has invalid cookie signature`);
        }
}

export class ValidationError extends Error {
        code = "VALIDATION";
        status = 400;

        constructor(public type: string, public validator: TSchema | TypeCheck<any>, public value: unknown) {
                const error = isProduction
                        ? undefined
                        : "Errors" in validator
                        ? validator.Errors(value).First()
                        : Value.Errors(validator, value).First();

                const customError = error?.schema.error
                        ? typeof error.schema.error === "function"
                                ? error.schema.error(type, validator, value)
                                : error.schema.error
                        : undefined;

                const accessor = error?.path?.slice(1) || "root";
                let message = "";

                if (customError) {
                        message = typeof customError === "object" ? JSON.stringify(customError) : customError + "";
                } else if (isProduction) {
                        message = JSON.stringify({
                                type,
                                message: error?.message,
                        });
                } else {
                        message = JSON.stringify(
                                {
                                        type,
                                        at: accessor,
                                        message: error?.message,
                                        expected: Value.Create(
                                                // @ts-ignore private field
                                                validator.schema,
                                        ),
                                        found: value,
                                        errors: [...validator.Errors(value)],
                                },
                                null,
                                2,
                        );
                }

                super(message);

                Object.setPrototypeOf(this, ValidationError.prototype);
        }

        get all() {
                return [...this.validator.Errors(this.value)];
        }

        static simplifyModel(validator: TSchema | TypeCheck<any>) {
                // @ts-ignore
                const model = "schema" in validator ? validator.schema : validator;

                try {
                        return Value.Create(model);
                } catch {
                        return model;
                }
        }

        get model() {
                return ValidationError.simplifyModel(this.validator);
        }

        toResponse(headers?: Record<string, any>) {
                return new Response(this.message, {
                        status: 400,
                        headers,
                });
        }
}
