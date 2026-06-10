import { sleep, type BunFile } from "bun";
import type { ITwitchUser } from "./user";
import type { ITwitchChat } from "./chat";
import TwitchUser from "./user";
import TwitchChat from "./chat";
import type { IEventSub } from "./eventsub";
import EventSub from "./eventsub";

const TWITCH_API_ENDPOINT = `https://api.twitch.tv/helix`;

const SCOPES = ["channel:bot", "user:write:chat", "user:read:chat", "channel:manage:broadcast", "channel:read:subscriptions", "moderator:read:followers"];

export type TwitchAppOptions = {
	clientId: string;
	clientSecret: string;
	tokensFile?: BunFile;
	tokens?: {
		access_token: string;
		refresh_token: string;
	};
	streamerUsername: string;
	scopes: string[];
};

export type APIResponse<T> = Promise<false | T>;
export type API = {
	GET<T>(endpoint: string): APIResponse<T>;
	POST<T>(endpoint: string, body: object): APIResponse<T>;
};

export interface ITwitchApp {
	api: API;
	events: IEventSub;
	bot: ITwitchUser;

	streamer: ITwitchUser;
	chat: ITwitchChat;
}

export default async function TwitchApp(opts: TwitchAppOptions): Promise<ITwitchApp> {
	async function REQ<T>(method: string, endpoint: string, body?: object) {
		let headers: { [_: string]: string } = {
			Authorization: `Bearer ${opts.tokens?.access_token}`,
			"Client-Id": `${opts.clientId}`,
		};
		if (body) headers["Content-Type"] = "application/json";
		let response = await fetch(`${TWITCH_API_ENDPOINT}${endpoint}`, {
			method,
			body: body ? JSON.stringify(body) : undefined,
			headers,
		});
		if (!response.ok) {
			console.error(await response.json());
			return false;
		}
		return <T>await response.json();
	}

	let api: API = {
		async GET<T>(endpoint: string) {
			return await REQ<T>("GET", endpoint);
		},
		async POST<T>(endpoint: string, body: object) {
			return await REQ<T>("POST", endpoint, body);
		},
	};

	async function loadTokens() {
		if (!opts.tokensFile) return;
		if (!(await opts.tokensFile.exists())) return;
		let tokensFile = await opts.tokensFile.json();
		if (!tokensFile) return;
		if (tokensFile.scopes.length != opts.scopes.length) return;
		for (var scope of tokensFile.scopes) {
			if (opts.scopes.indexOf(scope) == -1)
				return;
		}
		opts.tokens = tokensFile.tokens;
	}

	async function saveTokens() {
		if (opts.tokensFile) await opts.tokensFile.write(JSON.stringify({ tokens: opts.tokens, scopes: [...opts.scopes] }, null, "\t"));
	}

	async function refreshTokens() {
		if (!opts.tokens?.refresh_token) return false;
		let requestTokenBody = `${new URLSearchParams({
			client_id: opts.clientId,
			client_secret: opts.clientSecret,
			grant_type: `refresh_token`,
			refresh_token: opts.tokens?.refresh_token,
		})}`;

		let tokenResponse = await fetch(`https://id.twitch.tv/oauth2/token`, {
			method: "POST",
			body: requestTokenBody,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		});

		if (!tokenResponse.ok) return false;

		let tokenData = <any>await tokenResponse.json();

		opts.tokens = {
			access_token: tokenData.access_token,
			refresh_token: tokenData.refresh_token,
		};
		await saveTokens();
		return true;
	}

	async function requestAuth() {
		let authServer = Bun.serve({
			hostname: "127.0.0.1",
			port: 3000,
			routes: {
				"/": async req => {
					let url = new URL(req.url);

					if (!url.searchParams.has("code")) return new Response("Failed", { status: 400 });

					let requestTokenBody = `${new URLSearchParams({
						client_id: opts.clientId,
						client_secret: opts.clientSecret,
						code: <string>url.searchParams.get("code"),
						grant_type: `authorization_code`,
						redirect_uri: `http://localhost:3000`,
					})}`;

					let tokenResponse = await fetch(`https://id.twitch.tv/oauth2/token`, {
						method: "POST",
						body: requestTokenBody,
						headers: {
							"Content-Type": "application/x-www-form-urlencoded",
						},
					});

					if (!tokenResponse.ok) {
						console.error(await tokenResponse.json());
						return new Response("Failed", { status: 400 });
					}

					let tokenData = <any>await tokenResponse.json();

					opts.tokens = {
						access_token: tokenData.access_token,
						refresh_token: tokenData.refresh_token,
					};
					saveTokens();
					setTimeout(() => {
						authServer.stop();
					}, 1000);
					return new Response("Success!\nYou can now close this tab", {});
				},
			},
		});
		console.log("Please authorize the bot account");
		let authURL = new URL(
			`https://id.twitch.tv/oauth2/authorize?${new URLSearchParams({
				client_id: opts.clientId,
				redirect_uri: `http://localhost:3000`,
				response_type: `code`,
				scope: opts.scopes.join(" "),
			})}`,
		);
		console.log(authURL.href);
		while (!opts.tokens) await sleep(0);
		return true;
	}

	let botUserID: string = "";
	async function login() {
		if (!opts.tokens) await requestAuth();

		let validationResponse = await fetch(`https://id.twitch.tv/oauth2/validate`, {
			headers: {
				Authorization: `OAuth ${opts.tokens?.access_token}`,
			},
		});
		if (!validationResponse.ok || !(await refreshTokens())) {
			opts.tokens = undefined;
			return false;
		}
		let validation = <any>await validationResponse.json();
		botUserID = validation.user_id;
		return true;
	}

	await loadTokens();
	while (!(await login())) console.log("log in attempt failed, retrying...");

	let app: ITwitchApp = {
		api,
		events: <IEventSub>{},
		bot: <ITwitchUser>{},
		streamer: <ITwitchUser>{},
		chat: <ITwitchChat>{},
	};

	app.events = await EventSub(app);

	app.bot = await TwitchUser(app, botUserID);
	app.streamer = await TwitchUser(app, opts.streamerUsername, true);
	app.chat = await TwitchChat(app);
	return app;
}

import { type ITwitchChatMessage, type ITwitchBadge, type TwitchChatMessageType, type TwitchChatMessageFragment, type ITwitchChatter } from "./chatMessage";

export {
	type ITwitchChat,
	type ITwitchUser,
	type IEventSub,
	type ITwitchChatMessage,
	type ITwitchBadge,
	type TwitchChatMessageType,
	type TwitchChatMessageFragment,
	type ITwitchChatter,
};
