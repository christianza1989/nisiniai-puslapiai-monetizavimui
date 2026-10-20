export type SqlValue = string | number | null;
export type SqlCommand = {sql:string;params?:SqlValue[]};
