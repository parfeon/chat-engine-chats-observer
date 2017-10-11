/* eslint-disable no-unused-expressions,no-new */
import chai from 'chai';
import sinon from 'sinon';
import ChatEngine from 'chat-engine';
import sinonChai from 'sinon-chai';

const plugin = require('../../src/plugin');

chai.should();
chai.use(sinonChai);


describe('integration::plugin', () => {
    let chatEngine = null;
    let chat = null;

    beforeEach(() => {
        chatEngine = ChatEngine.create({
            publishKey: process.env.PUBLISH_KEY,
            subscribeKey: process.env.SUBSCRIBE_KEY
        }, { endpoint: 'http://127.0.0.1:3000/insecure', throwErrors: false });
    });

    afterEach(() => {
        if (chatEngine.pubnub) {
            chatEngine.pubnub.stop();
        }
        chatEngine = null;
    });

    it('should register as proto plugin', () => {
        (typeof chatEngine.protoPlugin).should.be.equal('function');
        chatEngine.protoPlugin('Chat', plugin());
    });

    it('should not emit \'$.chats.change\' for ignored chat', function completion(done) {
        const ignoredChats = ['TestChat1', 'TestChat2', 'Bob'];

        this.timeout(10000);
        chatEngine.protoPlugin('Chat', plugin({ ignoredChats }));
        chatEngine.connect('parfeon', {}, 'parfeon-authtoken');
        chatEngine.on('$.ready', () => {
            let triggerSpy = sinon.spy(chatEngine.me, 'trigger');
            chat = new chatEngine.Chat('Bob');
            triggerSpy.should.have.not.been.called;
            triggerSpy.restore();
            done();
        });
    });

    it('should emit \'$.chats.change\' for not ignored chat', function completion(done) {
        const ignoredChats = ['TestChat1', 'TestChat2', 'Bob'];

        this.timeout(10000);
        chatEngine.protoPlugin('Chat', plugin({ ignoredChats }));
        chatEngine.connect('parfeon', {}, 'parfeon-authtoken');
        chatEngine.on('$.ready', () => {
            let triggerSpy = sinon.spy(chatEngine.me, 'trigger');
            chat = new chatEngine.Chat('PubNub');

            triggerSpy.should.have.been.calledWith('$.chats.change', { state: 'added', chat });
            triggerSpy.restore();
            done();
        });
    });

    it('should emit \'$.chats.change\' with \'removed\' state on chat leave', function completion(done) {
        const ignoredChats = ['TestChat1', 'TestChat2', 'Bob'];

        this.timeout(10000);
        chatEngine.protoPlugin('Chat', plugin({ ignoredChats }));
        chatEngine.connect('parfeon', {}, 'parfeon-authtoken');
        chatEngine.on('$.ready', () => {
            let triggerSpy = null;
            chat = new chatEngine.Chat('PubNub');

            chat.on('$.connected', () => {
                triggerSpy = sinon.spy(chatEngine.me, 'trigger');
                chat.leave();
            });

            chatEngine.me.on('$.session.chat.leave', () => {
                triggerSpy.should.have.been.calledWith('$.chats.change', { state: 'removed', chat });
                triggerSpy.restore();
                done();
            });
        });
    });

    it('should emit \'$.chats.change\' with \'added\' state on chat re-join', function completion(done) {
        const ignoredChats = ['TestChat1', 'TestChat2', 'Bob'];

        this.timeout(10000);
        chatEngine.protoPlugin('Chat', plugin({ ignoredChats }));
        chatEngine.connect('parfeon', {}, 'parfeon-authtoken');
        chatEngine.on('$.ready', () => {
            let triggerSpy = null;
            chat = new chatEngine.Chat('PubNub');
            chat.on('$.connected', () => {
                if (triggerSpy === null) {
                    setTimeout(() => { chat.leave(); }, 1000);
                }
            });
            chatEngine.me.on('$.session.chat.leave', () => {
                triggerSpy = sinon.spy(chatEngine.me, 'trigger');

                // Re-join to chat.
                chat.connect();
            });

            chatEngine.me.on('$.session.chat.join', () => {
                if (triggerSpy !== null) {
                    const callArgs = triggerSpy.getCall(0).args;
                    callArgs[0].should.be.equal('$.chats.change');
                    callArgs[1].state.should.be.equal('added');
                    triggerSpy.restore();
                    done();
                    process.exit(0);
                }
            });
        });
    });
});
