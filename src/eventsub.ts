import { EventEmitter } from "events";
import { sleep } from "bun";
import type { EventSubMessage, EventSubNotificationMessage, EventSubWelcomeMessage } from "./eventsub.types";
import type { ITwitchApp } from "./app";

const TWITCH_EVENTSUB_WEBSOCKET = `wss://eventsub.wss.twitch.tv/ws`;

const TWITCH_EVENTSUB_REPLAY_TIMEOUT = 1000 * 60 * 10; // 10 Minutes

export type EventSubOptions = {
	clientID: string;
	botToken: string;
};

export interface IEventSub {
	on(event: string, fn: (...args: any[]) => any): any;
	once(event: string, fn: (...args: any[]) => any): any;
	off(event: string, fn: (...args: any[]) => any): any;
	sessionId: string;
	isActive(): boolean;
	sub(event: string, version: number, condition: { [_: string]: string }, fn: (...args: any[]) => any): Promise<boolean>;
}

export default async function EventSub(twitchApp: ITwitchApp): Promise<IEventSub> {
	let eventEmitter = new EventEmitter();

	let sessionId: string = "";
	// let keepalive_timer: NodeJS.Timeout;
	// let keepalive_seconds: number = 10;
	let prev_messages: { [_: string]: number } = {};

	/** @TODO Implement keep alive */

	let ws = new WebSocket(TWITCH_EVENTSUB_WEBSOCKET);

	setInterval(() => {
		let replay_timeout = Date.now() - TWITCH_EVENTSUB_REPLAY_TIMEOUT;
		for (let msgid in prev_messages) {
			let timestamp = <number>prev_messages[msgid];
			if (timestamp < replay_timeout) delete prev_messages[msgid];
		}
	}, TWITCH_EVENTSUB_REPLAY_TIMEOUT);

	ws.addEventListener("message", ws_msg => {
		let replay_timeout = Date.now() - TWITCH_EVENTSUB_REPLAY_TIMEOUT;
		let data = <EventSubMessage>JSON.parse(ws_msg.data);
		let timestamp = new Date(data.metadata.message_timestamp).valueOf();
		if (timestamp < replay_timeout) return;
		if ((prev_messages[data.metadata.message_id] ?? Infinity) < replay_timeout) return;
		prev_messages[data.metadata.message_id] = timestamp;
		if (data.metadata.message_type == "session_welcome") {
			let msg = <EventSubWelcomeMessage>data;
			sessionId = msg.payload.session.id;
			// keepalive_seconds = msg.payload.session.keepalive_timeout_seconds;
		}
		// keepalive();
		switch (data.metadata.message_type) {
			case "session_welcome":
				return;
			case "notification":
				let msg = <EventSubNotificationMessage<string, any>>data;
				eventEmitter.emit(msg.metadata.subscription_type, msg.payload);
				return;
		}
	});

	while (ws.readyState == WebSocket.CONNECTING) await sleep(0);
	while (sessionId == "" && ws.readyState == WebSocket.OPEN) await sleep(0);

	function isActive() {
		return ws.readyState == WebSocket.OPEN;
	}

	if (!isActive()) throw new Error("Couldn't connect to twitch events");

	return {
		on: (event: string, fn: (...args: any[]) => any) => {
			return eventEmitter.on(event, fn);
		},
		once: (event: string, fn: (...args: any[]) => any) => {
			return eventEmitter.once(event, fn);
		},
		off: (event: string, fn: (...args: any[]) => any) => {
			return eventEmitter.off(event, fn);
		},
		sessionId,
		isActive,
		async sub(event: string, version: number, condition: { [_: string]: string }, fn: (...args: any[]) => any) {
			if (!isActive()) throw new Error("EventSub is no longer active.");

			let subscription = await twitchApp.api.POST(`/eventsub/subscriptions`, {
				type: event,
				version: `${version}`,
				condition,
				transport: {
					method: "websocket",
					session_id: sessionId,
				},
			});

			if (!subscription) return false;
			eventEmitter.on(event, ev => {
				if (ev.subscription.version != version) return;
				for (var prop in condition) {
					var val = condition[prop];
					if (ev.subscription.condition[prop] != val) return;
				}
				fn(ev);
			});
			return true;
		},
	};
}
