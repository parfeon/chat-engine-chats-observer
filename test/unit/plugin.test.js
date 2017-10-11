/* eslint-disable no-unused-expressions,no-new */
import chai from 'chai';
import sinonChai from 'sinon-chai';
import { EventEmitter2 } from 'eventemitter2';

const plugin = require('../../src/plugin');

chai.should();
chai.use(sinonChai);


describe('unittest::plugin', () => {
    it('should export function', () => {
        (typeof plugin).should.be.equal('function');
    });

    it('should have expected plugin package', () => {
        const pluginPackage = plugin();

        pluginPackage.should.include.any.key('namespace');
        pluginPackage.should.include.any.key('extends');
        pluginPackage.extends.should.include.any.key('Chat');
    });

    describe('#constructor()', () => {
        let ChatEngine = null;

        beforeEach(() => {
            let me = new EventEmitter2({ newListener: false });
            ChatEngine = { me };
        });

        const setupExtensionForChat = (extension, chat = {}) => {
            extension.ChatEngine = ChatEngine;
            extension.parent = chat;
        };

        const extensionWithConfiguration = (configuration = {}) => {
            const extension = new (plugin(configuration).extends.Chat)();
            setupExtensionForChat(extension, configuration.chat);

            return extension;
        };

        it('should have \'unknown\' chat presence state', () => {
            const ChatExtension = plugin().extends.Chat;
            const extension = new ChatExtension();
            extension.chatState.should.be.equal('unknown');
        });

        it('should have empty list of ignored chats', () => {
            const extension = extensionWithConfiguration();
            extension.ignoredChats.should.have.lengthOf(0);
        });

        it('should have passed list of ignored chats', () => {
            const ignoredChats = ['TestChat1', 'TestChat2', 'Bob'];
            const extension = extensionWithConfiguration({ ignoredChats });
            extension.ignoredChats.should.be.equal(ignoredChats);
        });
    });
});
