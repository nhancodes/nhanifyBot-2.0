type Validate = {
    "client_id": string,
    "login": string,
    "scopes": string[],
    "user_id": string,
    "expires_in": number
}

type Refresh = {
    "access_token": string,
    "refresh_token": string,
    "scope": string[],
    "token_type": "bearer"
}

export type Create = {
    "access_token": string,
    "expires_in": number,
    "refresh_token": string,
    "scope": string[],
    "token_type": string
}
type Write = {
    entity: Entity;
}
export type ErrorResponse = {
    "status"?: number;
    "message": string;
}

export type Entity = 'bot' | 'broadcaster';
export type ValidateResponse = { type: "data", data: Validate } | { type: "error", error: ErrorResponse };
export type WriteResponse = { type: "data", data: Write } | { type: "error", error: ErrorResponse };
export type CreateResponse = { type: "data", data: Create } | { type: "error", error: ErrorResponse };
export type RefreshResponse = { type: "data", data: Refresh } | { type: "error", error: ErrorResponse };