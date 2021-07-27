import Service from '@ember/service';
import { inject as service } from '@ember/service';

export default class PushUpdatesWsService extends Service {
  @service('websockets') websockets;
  pollCallbackFunctions = new Set();

  constructor() {
    super(...arguments);

    if (!window.identifier) {
      fetch('/uuid')
        .then((response) => response.json())
        .then((data) => {
          window.identifier = data.uuid;
        })
        .catch((err) => {
          console.error(err);
        });
    }

    const l = window.location;
    const socket = this.websockets.socketFor(
      `${l.protocol === 'https:' ? 'wss://' : 'ws://'}${l.hostname}:3456`
    );
    socket.on('open', () => {
      socket.send(JSON.stringify({ id: window.identifier }));
    });

    socket.on('message', (event) => {
      let eventData = JSON.parse(event.data);
      let data = eventData.data,
        type = eventData.type,
        realm = eventData.realm;
      for (let func of this.pollCallbackFunctions) {
        func(data, type, realm);
      }
      console.log(`Received push update : ${JSON.stringify(eventData)}`);
    });

    socket.on('close', () => {
      socket.reconnect();
    });
  }

  addPollCallbackFunction(func) {
    this.pollCallbackFunctions.add(func);
  }
}