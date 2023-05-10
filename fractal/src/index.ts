import mqtt, { MqttClient } from "mqtt";
import logger from "./logger";

export const childTopics = [
    "site/123/photovoltaic/skidControlUnits/01A/inverters/1/status",
    "site/123/photovoltaic/skidControlUnits/01A/inverters/2/status",
    "site/123/photovoltaic/skidControlUnits/01A/inverters/3/status",
    "site/123/photovoltaic/skidControlUnits/01A/inverters/4/status",
    "site/123/photovoltaic/skidControlUnits/01A/inverters/5/status",
    "site/123/photovoltaic/skidControlUnits/01A/inverters/6/status",
  ];

export const parentTopic = "site/123/photovoltaic/skidControlUnits/01A/status";

const alarmStatus: Record<string, string> = {};

export const isValidMessage = (message: string): boolean => {
  return message === "0" || message === "1";
};

export const start = (url = "mqtt://localhost:1883"): MqttClient => {
  const client = mqtt.connect(url);

  client.on("connect", () => {
    logger.info("Connected to the MQTT broker");

    client.publish(parentTopic, "1");

    childTopics.forEach((topic) => {
      client.subscribe(topic);
      alarmStatus[topic] = "1";
    });
  });

  client.on("message", (topic, message) => {
    const status = message.toString();

    if (!isValidMessage(status)) {
      logger.warn(`Received an invalid message from topic '${topic}': '${status}'`);
      return;
    }

    alarmStatus[topic] = status;

    if (status === "0") {
      client.publish(parentTopic, "0");
    } else {
      const allChildAlarmsResolved = Object.values(alarmStatus).every((status) => status === "1");
      if (allChildAlarmsResolved) {
        client.publish(parentTopic, "1");
      }
    }
  });

  client.on("error", (error) => {
    logger.error(`MQTT client encountered an error: ${error.message}`);
});


  return client;
};

if (require.main === module) {
    start();
  }
