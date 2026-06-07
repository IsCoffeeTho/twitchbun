import type { ITwitchApp } from "./app";

type TwitchAPIUser = {
	id: string;
	login: string;
	display_name: string;
	type: "" | "staff" | "global_mod" | "admin";
	broadcaster_type: "" | "affiliate" | "partner";
	description: string;
	profile_image_url: string;
	offline_image_url: string;
	email?: string;
	created_at: string;
};

export enum TwitchUserType {
	Normal,
	Staff,
	GlobalMod,
	Admin,
}

export enum TwitchUserBroadcasterType {
	Normal,
	Affiliate,
	Partner,
}

export interface ITwitchUser {
	id: string;
	login: string;
	displayName: string;
	description: string;
	type: TwitchUserType;
	broadcasterType: TwitchUserBroadcasterType;
	profileImage: string;
	offlineImage: string;
	email?: string;
	createdAt: Date;
}

/** @TODO 'on' function can subscribe to eventsub events */
export default async function TwitchUser(twitchApp: ITwitchApp, id: string, login = false) {
	let userAPI = await twitchApp.api.GET<{ data: TwitchAPIUser[] }>(`/users?${login ? "login" : "id"}=${id}`);
	if (!userAPI) throw new Error(`User "${id}" cannot be found`);
	let user = <TwitchAPIUser>userAPI.data[0];
	let userObject: ITwitchUser = {
		id: user.id,
		login: user.login,
		displayName: user.display_name,
		description: user.description,
		type: ["", "staff", "global_mod", "admin"].indexOf(user.type),
		broadcasterType: ["", "affiliate", "partner"].indexOf(user.broadcaster_type),
		profileImage: user.profile_image_url,
		offlineImage: user.offline_image_url,
		email: user.email,
		createdAt: new Date(user.created_at),
	};
	return userObject;
}
