from fastapi import FastAPI
from .routes import router


def document():
    app = FastAPI(title="Owned mail and Lithuanian display translation", version="1.0.0")
    app.include_router(router)
    value = app.openapi()
    for methods in value["paths"].values():
        for operation in methods.values():
            operation["security"] = [{"CoreSession": []}]
            operation["responses"].pop("422", None)
    value["components"]["securitySchemes"] = {"CoreSession": {"type": "http", "scheme": "bearer"}}
    return value
