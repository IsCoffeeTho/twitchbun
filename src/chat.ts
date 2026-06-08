import type { ITwitchApp } from "./app";
import { EventEmitter } from "events";
import TwitchChatMessage, { TwitchChatter, type ITwitchChatMessage, type ITwitchChatter } from "./chatMessage";
import type { ITwitchStreamerUser } from "./streamer";

type chatEventMap = {
	message: ITwitchChatMessage;
	clear: {
		streamer: ITwitchStreamerUser;
	};
	purge: {
		chatter: ITwitchChatter;
		streamer: ITwitchStreamerUser;
	};
};

export interface ITwitchChat {
	on<K extends keyof chatEventMap>(event: K, fn: (ev: chatEventMap[K]) => any): any;
	once<K extends keyof chatEventMap>(event: K, fn: (ev: chatEventMap[K]) => any): any;
	off<K extends keyof chatEventMap>(event: K, fn: (ev: chatEventMap[K]) => any): any;
	send(message: string): Promise<boolean>;
}

export default async function TwitchChat(twitchApp: ITwitchApp) {
	let eventEmitter = new EventEmitter();

	if (
		!twitchApp.events.sub(
			"channel.chat.message",
			1,
			{
				broadcaster_user_id: twitchApp.streamer.id,
				user_id: twitchApp.bot.id,
			},
			ev => {
				if (ev.event.chatter_user_id == twitchApp.bot.id) return;
				eventEmitter.emit("message", TwitchChatMessage(twitchApp, ev.event));
			},
		)
	)
		throw new Error("Failed to read the chat");

	twitchApp.events.sub(
		"channel.chat.clear",
		1,
		{
			broadcaster_user_id: twitchApp.streamer.id,
			user_id: twitchApp.bot.id,
		},
		ev => {
			eventEmitter.emit("clear", {
				streamer: twitchApp.streamer,
			});
		},
	);

	twitchApp.events.sub(
		"channel.chat.clear_user_messages",
		1,
		{
			broadcaster_user_id: twitchApp.streamer.id,
			user_id: twitchApp.bot.id,
		},
		ev => {
			eventEmitter.emit("purge", {
				chatter: TwitchChatter(twitchApp, {
					id: ev.target_user_id,
					login: ev.target_user_login,
					displayName: ev.target_user_name,
				}),
				streamer: twitchApp.streamer,
			});
		},
	);

	let chatObject: ITwitchChat = {
		on<K extends keyof chatEventMap>(event: K, fn: (ev: chatEventMap[K]) => any) {
			return eventEmitter.on(event, fn);
		},
		once<K extends keyof chatEventMap>(event: K, fn: (ev: chatEventMap[K]) => any) {
			return eventEmitter.once(event, fn);
		},
		off<K extends keyof chatEventMap>(event: K, fn: (ev: chatEventMap[K]) => any) {
			return eventEmitter.off(event, fn);
		},
		async send(message: string) {
			let res = await twitchApp.api.POST(`/chat/messages`, {
				broadcaster_id: twitchApp.streamer.id,
				sender_id: twitchApp.bot.id,
				message,
			});
			return !!res;
		},
	};

	return chatObject;
}
