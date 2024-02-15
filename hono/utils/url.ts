export type Pattern = readonly [string, string, RegExp | true] | "*";

export const splitPath = (path: string): string[] => {
        const paths = path.split("/");
        if (paths[0] === "") paths.shift();
        return paths;
};

export const splitRoutingPath = (routePath: string): string[] => {
        const { groups, path } = extractGroupsFromPath(routePath);
        const paths = splitPath(path);
        return replaceGroupMarks(paths, groups);
};

const extractGroupsFromPath = (path: string): { groups: [string, string][]; path: string } => {
        const groups: [string, string][] = [];
        // {}로 둘러싸인 어떠한 문자열을 전체 문자열에서 찾아냅니다.
        path = path.replace(/\{[^}]+\}/g, (match, index) => {
                const mark = `@${index}`;
                groups.push([mark, match]);
                return mark;
        });
        return { groups, path };
};

const replaceGroupMarks = (paths: string[], groups: [string, string][]): string[] => {
        for (let i = groups.length - 1; i >= 0; i--) {
                const [mark] = groups[i];

                for (let j = paths.length - 1; j >= 0; j--) {
                        if (paths[j].includes(mark)) {
                                paths[j].replace(mark, groups[i][1]);
                                break;
                        }
                }
        }
        return paths;
};

const patternCache: { [key: string]: Pattern } = {};

export const getPattern = (label: string): Pattern | null => {
        if (label === "*") return "*";

        // :로 시작하는 문자열
        // 콜론 뒤에 중괄호로 둘러싸인 문자열이 있을 수도 있고 없을 수도 있습니다.
        const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
        if (!match) return null;

        if (!patternCache[label]) {
                if (match[2]) {
                        patternCache[label] = [label, match[1], new RegExp("^" + match[2] + "$")];
                } else {
                        patternCache[label] = [label, match[1], true];
                }
        }
        return patternCache[label];
};

// https://example.com/path/to/resource?query에서 getPath를 호출하면 /path/to/resource가 반환
export const getPath = (request: Request): string => {
        const match = request.url.match(/^https?:\/\/[^/]+(\/[^?]*)/);
        return match ? match[1] : "";
};

export const getQueryStrings = (url: string): string => {
        const queryIndex = url.indexOf("?", 8);
        return queryIndex === -1 ? "" : "?" + url.slice(queryIndex + 1);
};

export const getPathNoStrict = (request: Request): string => {
        const result = getPath(request);
        return result.length > 1 && result[result.length - 1] === "/" ? result.slice(0, -1) : result;
};

export const mergePath = (...paths: string[]): string => {
        let p: string = "";
        let endsWithSlash = false;
        for (let path of paths) {
                if (p[p.length - 1] === "/") {
                        p = p.slice(0, -1);
                        endsWithSlash = true;
                }

                if (path[0] !== "/") path = `/${path}`;
                if (path === "/" && endsWithSlash) p = `${p}/`;
                else if (path !== "/") p = `${p}${path}`;
                if (path === "/" && p === "") p = "/";
        }
        return p;
};

export const checkOptionalParameter = (path: string): string[] | null => {
        if (!path.match(/\:.+\?$/)) return null;

        const segment = path.split("/");
        const results: string[] = [];
        let basePath = "";

        segment.forEach((segment) => {
                if (segment !== "" && !/\:/.test(segment)) {
                        basePath += "/" + segment;
                } else if (/\:/.test(segment)) {
                        if (/\?/.test(segment)) {
                                if (results.length == 0 && basePath == "") {
                                        results.push("/");
                                } else {
                                        results.push(basePath);
                                }
                                const optionalSegment = segment.replace("?", "");
                                basePath += "/" + optionalSegment;
                                results.push(basePath);
                        } else {
                                basePath += "/" + segment;
                        }
                }
        });

        return results.filter((v, i, a) => a.indexOf(v) === i);
};

const decodeURIComponent_ = decodeURIComponent;

const _decodeURI = (value: string) => {
        if (!/[%+]/.test(value)) return value;
        if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
        return /%/.test(value) ? decodeURIComponent_(value) : value;
};
