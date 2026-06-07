import type { ITwitchApp } from "./app";
import type { ITwitchUser } from "./user";
import TwitchUser from "./user";

export interface ITwitchChatter {
	id: string;
	login: string;
	displayName: string;
	getUser(): Promise<ITwitchUser>;
}

export function TwitchChatter(
	twitchApp: ITwitchApp,
	info: {
		id: string;
		login: string;
		displayName: string;
	},
): ITwitchChatter {
	return {
		id: info.id,
		login: info.login,
		displayName: info.displayName,
		async getUser() {
			return await TwitchUser(twitchApp, info.id);
		},
	};
}

export type TwitchChatMessageFragment =
	| {
			type: "text";
			text: string;
	  }
	| {
			type: "emote";
			text: string;
			emote: {
				id: string;
				emote_set_id: string;
				owner_id: string;
				format: string[];
			};
	  }
	| {
			type: "cheermote";
			text: string;
			cheermote: {
				prefix: string;
				bits: number;
				tier: number;
			};
	  }
	| {
			type: "mention";
			text: string;
			mention: {
				user_id: string;
				user_name: string;
				user_login: string;
			};
	  };

enum TwitchChatMessageType {
	Text,
	Highlighted,
	RedeemedSubOnly,
	UserIntro,
	MessageEffect,
	GigantifiedEmote,
}

export interface ITwitchBadge {
	set_id: string;
	id: string;
	info: string;
}

export interface ITwitchChatMessage {
	id: string;
	streamer: ITwitchUser;
	chatter: ITwitchChatter;
	type: TwitchChatMessageType;
	text: string;
	fragments: TwitchChatMessageFragment[];
	color: string;
	badges: ITwitchBadge[];
	reply(msg: string): Promise<boolean>;
}

/** https://dev.twitch.tv/docs/eventsub/eventsub-reference/#channel-chat-message-event */
export default function TwitchChatMessage(twitchApp: ITwitchApp, event: any) {
	let msg: ITwitchChatMessage = {
		id: event.message_id,
		streamer: twitchApp.streamer,
		chatter: TwitchChatter(twitchApp, {
			id: event.chatter_user_id,
			login: event.chatter_user_login,
			displayName: event.chatter_user_name,
		}),
		type: [
			"text",
			"channel_points_highlighted",
			"channel_points_sub_only",
			"user_intro",
			"power_ups_message_effect",
			"power_ups_gigantified_emote",
		].indexOf(event.message_type),
		text: event.message.text,
		fragments: event.message.fragments,
		color: event.color,
		badges: <ITwitchBadge[]>event.badges,
		async reply(message: string) {
			let res = await twitchApp.api.POST(`/chat/messages`, {
				broadcaster_id: twitchApp.streamer.id,
				sender_id: twitchApp.bot.id,
				message,
				reply_parent_message_id: event.message_id,
			});
			return !!res;
		},
	};

	return msg;
}
