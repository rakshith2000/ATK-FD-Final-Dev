export interface UploadVaultConfigRequest {
    vault_type: string;
    vault_env_file: File;
}

export interface UploadVaultConfigResponse {
    message: string;
}
