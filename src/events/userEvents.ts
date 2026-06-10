import type { ITwitchApp, ITwitchChatter, ITwitchUser } from "../app";
import { TwitchChatter } from "../chatMessage";

export type UserEventMap = {
	follow: {
		chatter: ITwitchChatter;
		streamer: ITwitchUser;
		followedAt: Date;
	};
	sub: {
		chatter: ITwitchChatter;
		streamer: ITwitchUser;
		tier: number;
		isGift: boolean;
	};
	resub: {
		chatter: ITwitchChatter;
		streamer: ITwitchUser;
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
		streamer: ITwitchUser;
		tier: number;
		gifts: number;
		totalGifts: number | null;
	};
	cheer: {
		chatter: ITwitchChatter | null;
		streamer: ITwitchUser;
		message: string;
		bits: number;
	};
	raid: {
		chatter: ITwitchChatter;
		streamer: ITwitchUser;
		viewers: number;
	};
};

export default function UserEventEmitter(twitchApp: ITwitchApp, user: ITwitchUser): ITwitchUser {
	/** @TODO implement more event subscriptions */
	user.on = async (event: string, fn: (...arg: any[]) => any) => {
		let eventSub: { name: string; version: number; condition: any; cnv(ev: any): void } | undefined = undefined;
		switch (event) {
			case "follow":
				eventSub = {
					name: "channel.follow",
					version: 2,
					condition: {
						broadcaster_user_id: user.id,
						moderator_user_id: twitchApp.bot.id,
					},
					cnv(ev: any) {
						fn({
							chatter: TwitchChatter(twitchApp, {
								id: ev.user_id,
								login: ev.user_login,
								displayName: ev.user_name,
							}),
							streamer: user,
							followedAt: new Date(ev.followed_at),
						});
					},
				};
				break;
			case "sub":
				eventSub = {
					name: "channel.subscribe",
					version: 1,
					condition: {
						broadcaster_user_id: user.id,
					},
					cnv(ev: any) {
						fn({
							chatter: TwitchChatter(twitchApp, {
								id: ev.user_id,
								login: ev.user_login,
								displayName: ev.user_name,
							}),
							streamer: user,
							tier: parseInt(ev.tier[0]),
							ifGift: ev.is_gift,
						});
					},
				};
				break;
			case "resub":
				eventSub = {
					name: "channel.subscribe.message",
					version: 1,
					condition: {
						broadcaster_user_id: user.id,
					},
					cnv(ev: any) {
						fn({
							chatter: TwitchChatter(twitchApp, {
								id: ev.user_id,
								login: ev.user_login,
								displayName: ev.user_name,
							}),
							streamer: user,
							message: ev.message,
							total: ev.cumulative_total,
							streak: ev.streak_months,
							duration: ev.duration_months,
							tier: parseInt(ev.tier[0]),
						});
					},
				};
				break;
			case "giftedSubs":
				eventSub = {
					name: "channel.subscribe.gift",
					version: 1,
					condition: {
						broadcaster_user_id: user.id,
					},
					cnv(ev: any) {
						fn({
							chatter: ev.is_anonymus
								? null
								: TwitchChatter(twitchApp, {
										id: ev.user_id,
										login: ev.user_login,
										displayName: ev.user_name,
									}),
							streamer: user,
							tier: parseInt(ev.tier[0]),
							gifts: ev.total,
							totalGifts: ev.cumulative_total,
						});
					},
				};
				break;
			case "cheer":
				eventSub = {
					name: "channel.cheer",
					version: 1,
					condition: {
						broadcaster_user_id: user.id,
					},
					cnv(ev: any) {
						fn({
							chatter: ev.is_anonymus
								? null
								: TwitchChatter(twitchApp, {
										id: ev.user_id,
										login: ev.user_login,
										displayName: ev.user_name,
									}),
							streamer: user,
							message: ev.message,
							bits: ev.bits,
						});
					},
				};
				break;
			case "raid":
				eventSub = {
					name: "channel.raid",
					version: 1,
					condition: {
						broadcaster_user_id: user.id,
					},
					cnv(ev: any) {
						fn({
							chatter: TwitchChatter(twitchApp, {
								id: ev.from_broadcaster_user_id,
								login: ev.from_broadcaster_user_login,
								displayName: ev.from_broadcaster_user_name,
							}),
							streamer: user,
							viewers: ev.viewers,
						});
					},
				};
				break;
		}
		if (eventSub) await twitchApp.events.sub(eventSub.name, eventSub.version, eventSub.condition, eventSub.cnv);
	};
	return user;
}
