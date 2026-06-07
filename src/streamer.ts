import type { ITwitchApp } from "./app";
import { TwitchChatter, type ITwitchChatter } from "./chatMessage";
import type { ITwitchUser } from "./user";

type streamerEventMap = {
	follow: {
		chatter: ITwitchChatter;
		streamer: ITwitchStreamerUser;
		followedAt: Date;
	};
	sub: {
		chatter: ITwitchChatter;
		streamer: ITwitchStreamerUser;
		tier: number;
		isGift: boolean;
	};
	resub: {
		chatter: ITwitchChatter;
		streamer: ITwitchStreamerUser;
		message: {
			text: string;
			emotes: { begin: number; end: number; id: string }[];
		};
		total: number;
		streak: number | null;
		duration: number;
		tier: number;
	};
	giftedSubs: {
		chatter: ITwitchChatter | null;
		streamer: ITwitchStreamerUser;
		tier: number;
		gifts: number;
		totalGifts: number | null;
	};
	cheer: {
		chatter: ITwitchChatter | null;
		streamer: ITwitchStreamerUser;
		message: string;
		bits: number;
	};
	raid: {
		chatter: ITwitchChatter;
		streamer: ITwitchStreamerUser;
		viewers: number;
	};
};

export interface ITwitchStreamerUser extends ITwitchUser {
	on<K extends keyof streamerEventMap>(event: K, fn: (ev: streamerEventMap[K]) => any): any;
}

export default function wrapAsStreamer(twitchApp: ITwitchApp, user: ITwitchUser): ITwitchStreamerUser {
	let streamerUser = <ITwitchStreamerUser>user;

	/** @TODO implement more event subscriptions */
	streamerUser.on = (event: string, fn: (...arg: any[]) => any) => {
		switch (event) {
			case "follow":
				twitchApp.events.sub(
					"channel.follow",
					2,
					{
						broadcaster_user_id: user.id,
						moderator_user_id: twitchApp.bot.id,
					},
					(ev: any) => {
						fn({
							chatter: TwitchChatter(twitchApp, {
								id: ev.user_id,
								login: ev.user_login,
								displayName: ev.user_name,
							}),
							streamer: streamerUser,
							followedAt: new Date(ev.followed_at),
						});
					},
				);
				break;
			case "sub":
				twitchApp.events.sub(
					"channel.subscribe",
					1,
					{
						broadcaster_user_id: user.id,
					},
					(ev: any) => {
						fn({
							chatter: TwitchChatter(twitchApp, {
								id: ev.user_id,
								login: ev.user_login,
								displayName: ev.user_name,
							}),
							streamer: streamerUser,
							tier: parseInt(ev.tier[0]),
							ifGift: ev.is_gift,
						});
					},
				);
				break;
			case "resub":
				twitchApp.events.sub(
					"channel.subscribe.message",
					1,
					{
						broadcaster_user_id: user.id,
					},
					(ev: any) => {
						fn({
							chatter: TwitchChatter(twitchApp, {
								id: ev.user_id,
								login: ev.user_login,
								displayName: ev.user_name,
							}),
							streamer: streamerUser,
							message: ev.message,
							total: ev.cumulative_total,
							streak: ev.streak_months,
							duration: ev.duration_months,
							tier: parseInt(ev.tier[0]),
						});
					},
				);
				break;
			case "giftedSubs":
				twitchApp.events.sub(
					"channel.subscribe.gift",
					1,
					{
						broadcaster_user_id: user.id,
					},
					(ev: any) => {
						fn({
							chatter: ev.is_anonymus
								? null
								: TwitchChatter(twitchApp, {
										id: ev.user_id,
										login: ev.user_login,
										displayName: ev.user_name,
									}),
							streamer: streamerUser,
							tier: parseInt(ev.tier[0]),
							gifts: ev.total,
							totalGifts: ev.cumulative_total,
						});
					},
				);
				break;
			case "cheer":
				twitchApp.events.sub(
					"channel.cheer",
					1,
					{
						broadcaster_user_id: user.id,
					},
					(ev: any) => {
						fn({
							chatter: ev.is_anonymus
								? null
								: TwitchChatter(twitchApp, {
										id: ev.user_id,
										login: ev.user_login,
										displayName: ev.user_name,
									}),
							streamer: streamerUser,
							message: ev.message,
							bits: ev.bits,
						});
					},
				);
				break;
			case "raid":
				twitchApp.events.sub(
					"channel.raid",
					1,
					{
						broadcaster_user_id: user.id,
					},
					(ev: any) => {
						fn({
							chatter: TwitchChatter(twitchApp, {
								id: ev.from_broadcaster_user_id,
								login: ev.from_broadcaster_user_login,
								displayName: ev.from_broadcaster_user_name,
							}),
							streamer: streamerUser,
							viewers: ev.viewers,
						});
					},
				);
				break;
		}
	};

	return streamerUser;
}
