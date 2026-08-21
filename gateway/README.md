# Gateway

Responsible for routing requests to the appropriate services. This is the entry point for all requests to the system. It is responsible for authenticating requests, validating input, and routing requests to the appropriate service.

## Example Request

```http
GET /users/123 HTTP/1.1
Host: gateway.example.com
Authorization: Bearer <token>
```

This will direct the request to the `users` service, which will handle the request and return a response.