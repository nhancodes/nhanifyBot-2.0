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
export type ValidateResponse = { type: "data", message: string, data: Validate} | { type: "error", error: ErrorResponse };
export type WriteResponse = { type: "data", message: string,  data: Write } | { type: "error", error: ErrorResponse };
export type CreateResponse = { type: "data", message: string, data: Create } | { type: "error", error: ErrorResponse };
export type RefreshResponse = { type: "data", message: string, data: Refresh } | { type: "error", error: ErrorResponse };
//export type AuthResult = {type: "validate", result: ValidateResponse} | {type: "write", result: WriteResponse} | {type: "refresh", result: RefreshResponse}| {type: "create", result: CreateResponse};
export type AuthResult =  ValidateResponse |  WriteResponse |  RefreshResponse |  CreateResponse;