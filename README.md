# twitchlib

```ts
// index.ts
import TwitchApp from "twitchbun";

const app = await TwitchApp({
	clientId: "12345",
	clientSecret: "123456754321",
	tokensFile: Bun.file(`./tokens.json`), // will try to store bot tokens to be used
	streamerUsername: "",
});

app.chat.on("message", (ev) => {
	console.log(`\x1b[1m${ev.chatter.displayName}\x1b[0m: ${ev.text}`);
});
```

