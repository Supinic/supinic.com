## API Code of conduct

If possible, always include your `User-Agent` header with a small description of your project and perhaps a way of contacting the author,
or a code link on Github, or anything to describe the project that uses the API.
This extra info makes debugging, error hunting and making statistics a lot easier. 🙂

## Authorization

In order to access endpoints with required authorization, you must provide your user id/name and your API authorization key.

### Getting an API key
1) Head over to the [Get API key](https://supinic.com/user/auth-key) section on the website
2) Log in, if not logged in already
3) Generate your key! Make sure to save both your user ID and the key together 

### Using the key

##### Headers
When making a request, in your headers, include the following authorization header structure:

`Authorization: Basic (user-id):(api-key)`

Sample `fetch` request:
```js
await fetch("https://supinic.com/api/test/auth", {
    headers: {
        Authorization: "Basic 12345:abcde"
    }
});
```

##### URL params
When making any request, along with any other params, include these two:
- `auth_user` - your user ID
- `auth_key` - your API key

Sample `fetch` request:
```js
await fetch("https://supinic.com/api/test/auth?auth_user=12345&auth_key=abcde");
```
