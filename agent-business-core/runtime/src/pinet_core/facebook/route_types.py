from fastapi import HTTPException, Request
from fastapi.routing import APIRoute


class BoundedRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def bounded(request: Request):
            if request.method in {"POST", "PUT"} and len(await request.body()) > 20000:
                raise HTTPException(413, "facebook_request_too_large")
            return await handler(request)

        return bounded
