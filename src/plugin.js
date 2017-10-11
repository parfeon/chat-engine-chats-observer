/**
 * Basic interface for {@link Chat} class extensions.
 * @private
 */
class ChatEngineChatPlugin {
    constructor() {
        /** @type {ChatEngine} */
        this.ChatEngine = null;
        /** @type {Chat} */
        this.parent = null;
    }
}

/**
 * {@link Chat} extension which allow to track when new instance is created and use local user
 * {@link Me} to _emit_ `$.chats.change` event along with reference on created {@link Chat}
 * instance.
 * @private
 */
class ChatExtension extends ChatEngineChatPlugin {
    /**
     * Create and configure {@link Chat} extension class which provide ability to notify about new
     * entries addition and removal from local user ({@link Me}) `chats` list.
     *
     * @param {Object} [configuration] - Observer plugin configuration object.
     * @param {String[]} configuration.ignoredChats - Reference on list of chats for which plugin
     *     shouldn't emit `$.chats.change` event.
     */
    constructor(configuration = {}) {
        super();
        this.chatState = 'unknown';
        this.ignoredChats = configuration.ignoredChats || [];
    }

    /**
     * Plugin construction completion function which is called by plugin integration code.
     * @private
     */
    construct() {
        if (!this.isIgnoredChat(this.parent) && this.ChatEngine.me) {
            this.chatState = 'added';
            this.ChatEngine.me.trigger('$.chats.change', this.eventPayload());
            this.ChatEngine.me.on('$.session.chat.leave', this.onChatLeave.bind(this));
        }
    }

    /**
     * Handle user `leave` event for one of his chats. Function allow to check whether target
     * channels is the same as controller by plugin and trigger required state change.
     *
     * @param {Chat} chat - Reference on chat from which user issued `leave` event.
     * @private
     */
    onChatLeave({ chat }) {
        if (chat.channel === this.parent.channel && ['unknown', 'added'].includes(this.chatState)) {
            this.chatState = 'removed';
            this.ChatEngine.me.trigger('$.chats.change', this.eventPayload());
            this.ChatEngine.me.off('$.session.chat.leave', this.onChatLeave);
            this.ChatEngine.me.on('$.session.chat.join', this.onChatJoin.bind(this));
        }
    }

    /**
     * Handle user `join` event for one of his chats. Function allow to check whether target
     * channels is the same as controller by plugin and trigger required state change.
     *
     * @param {Chat} chat - Reference on chat to which user joined back.
     * @private
     */
    onChatJoin({ chat }) {
        if (chat.channel === this.parent.channel && ['unknown', 'removed'].includes(this.chatState)) {
            this.chatState = 'added';
            this.ChatEngine.me.trigger('$.chats.change', this.eventPayload());
            this.ChatEngine.me.off('$.session.chat.join', this.onChatJoin);
            this.ChatEngine.me.on('$.session.chat.leave', this.onChatLeave.bind(this));
        }
    }

    /**
     * Compose user's chat list change payload object.
     *
     * @return {{state: String, chat: Chat}} Reference on notification payload with current chat
     *     presence state.
     */
    eventPayload() {
        return { state: this.chatState, chat: this.parent };
    }

    /**
     * Check whether passed {@link Chat} belong to one of which should be excluded from public user
     * chats list.
     *
     * @param {Chat} chat - Reference on chat which should be examined.
     * @return {boolean} _true_ in case if chat represent non-public chat instances or one from
     *     debug server (Main, Support, Docs and Foolery).
     * @private
     */
    isIgnoredChat(chat) {
        if (!this.ignoredChats.length || !this.ChatEngine.global) {
            return false;
        }
        return this.ignoredChats.filter(chatName => chat.channel.endsWith(chatName)).length > 0;
    }
}

/**
 * Chat extension plugin configuration.
 *
 * @param {Object} [configuration] - Observer plugin configuration object.
 * @param {String[]} configuration.ignoredChats - Reference on list of chats for which plugin
 *     shouldn't emit `$.chats.change` event.
 */
module.exports = configuration => ({
    namespace: 'chatsObserverExtension',
    extends: {
        Chat: class ConfigurableChatExtension {
            constructor() { return new ChatExtension(configuration); }
        }
    }
});
