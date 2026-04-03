declare module 'validator' {
  type IsURLOptions = {
    protocols?: string[];
    require_protocol?: boolean;
  };

  type NormalizeEmailOptions = {
    gmail_remove_dots?: boolean;
    gmail_remove_subaddress?: boolean;
    outlookdotcom_remove_subaddress?: boolean;
    yahoo_remove_subaddress?: boolean;
    icloud_remove_subaddress?: boolean;
  };

  const validator: {
    escape: (input: string) => string;
    normalizeEmail: (email: string, options?: NormalizeEmailOptions) => string | false;
    isEmail: (input: string) => boolean;
    isURL: (input: string, options?: IsURLOptions) => boolean;
  };

  export default validator;
}
