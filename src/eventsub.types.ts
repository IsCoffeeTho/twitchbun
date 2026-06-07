export type EventSubMessage<Type extends string = string, Payload extends object = object, TypePayload = {}> = {
	metadata: {
		message_id: string;
		message_type: Type;
		message_timestamp: string;
	} & TypePayload;
	payload: Payload;
};

export type EventSubKeepAliveMessage = EventSubMessage<"session_keepalive", {}>;

export type EventSubWelcomeMessage = EventSubMessage<
	"session_welcome",
	{
		session: {
			id: string;
			status: string;
			keepalive_timeout_seconds: number;
			reconnect_url: string;
			connected_at: string;
		};
	}
>;

export type EventSubNotificationMessage<EventName, EventPayload> = EventSubMessage<
	"notification",
	{
		subscription: {
			id: string;
			status: "enabled" | "disabled" | string;
			type: EventName;
			version: string;
			condition: object;
			transport: object;
			created_at: string;
			cost: number;
		};
		event: EventPayload;
	},
	{ subscription_type: EventName; subscription_version: string }
>;
