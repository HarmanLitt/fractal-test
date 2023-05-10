// mqttClient.test.ts
import { start, childTopics, parentTopic, isValidMessage } from '../index';
import mqtt, { MqttClient } from 'mqtt';
import logger from '../logger';
import sinon from 'sinon';

describe('mqttClient', () => {
    let mqttClient: MqttClient;
    let warnSpy: sinon.SinonSpy;
    let connectStub: sinon.SinonStub;
  
    beforeEach(() => {
      warnSpy = sinon.spy(logger, 'warn');
      connectStub = sinon.stub(mqtt, 'connect');
      const fakeClient = sinon.createStubInstance(mqtt.MqttClient) as unknown as MqttClient;
      connectStub.returns(fakeClient);
      mqttClient = start('mqtt://localhost:1883');
    });
  
    afterEach(() => {
        if (mqttClient) {
          mqttClient.end(true);
        }
        sinon.restore();
      });
      
  
    describe('start', () => {
      it('should connect to the MQTT broker', () => {
        expect(connectStub.calledOnce).toBeTruthy();
      });
  
      it('should subscribe to child topics', () => {
        mqttClient.on('connect', () => {
          childTopics.forEach((topic) => {
            expect((mqttClient.subscribe as sinon.SinonStub).calledWith(topic)).toBeTruthy();
          });
        });
  
        mqttClient.emit('connect');
      });
  
      it('should publish initial parent topic status', () => {
        mqttClient.on('connect', () => {
          expect((mqttClient.publish as sinon.SinonStub).calledWith(parentTopic, '1')).toBeTruthy();
        });
  
        mqttClient.emit('connect');
      });
    });

  describe('isValidMessage', () => {
    it('should return true for valid messages', () => {
      expect(isValidMessage('0')).toBeTruthy();
      expect(isValidMessage('1')).toBeTruthy();
    });

    it('should return false for invalid messages', () => {
      expect(isValidMessage('2')).toBeFalsy();
      expect(isValidMessage('a')).toBeFalsy();
      expect(isValidMessage('-1')).toBeFalsy();
    });
  });

  describe('message handling', () => {
    it('should log a warning for an invalid message', () => {
        const messageCallback = (mqttClient.on as sinon.SinonStub).args.find(args => args[0] === 'message')?.[1];
        if (messageCallback) {
          messageCallback(childTopics[0], 'invalid');
        }
        expect(warnSpy.calledOnce).toBeTruthy();
      });

      it('should set parentTopic status to 0 if any child has a status of 0', () => {
        const messageCallback = (mqttClient.on as sinon.SinonStub).args.find(args => args[0] === 'message')?.[1];
        if (messageCallback) {
          messageCallback(childTopics[0], '0');
        }
        expect((mqttClient.publish as sinon.SinonStub).calledWith(parentTopic, '0')).toBeTruthy();
      });
      
      it('should set parentTopic status to 1 if all child alarms are resolved', () => {
        const messageCallback = (mqttClient.on as sinon.SinonStub).args.find(args => args[0] === 'message')?.[1];
        if (messageCallback) {
          childTopics.forEach((topic) => messageCallback(topic, '1'));
        }
        expect((mqttClient.publish as sinon.SinonStub).calledWith(parentTopic, '1')).toBeTruthy();
      });
  });
});
