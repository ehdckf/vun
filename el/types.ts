export type DecoratorBase = {
        request: {
                [x: string]: unknown;
        };
        store: {
                [x: string]: unknown;
        };
        derive: {
                [x: string]: unknown;
        };
        resolve: {
                [x: string]: unknown;
        };
};

export interface RouteSchema {
        body?: unknown;
        headers?: unknown;
        query?: unknown;
        params?: unknown;
        cookie?: unknown;
        response?: unknown;
}

export type Prettify<Type> = {
        [Key in keyof Type]: Type[Key];
} & {};

type IsPathParameter<Part extends string> = Part extends `:${infer Parameter}`
        ? Parameter
        : Part extends "*"
        ? "*"
        : never;

export type GetPathParameter<Path extends string> = Path extends `${infer A}/${infer B}`
        ? IsPathParameter<A> | GetPathParameter<B>
        : IsPathParameter<Path>;
