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

    fetch('/push-update-ws', {
      headers: { 'MU-TAB-ID': window.identifier },
    })
      // .then((response) => response.json())
      .then((resp) => {
        let url = resp.url.replace(/^http/, 'ws');
        const socket = this.websockets.socketFor(url);
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
      });
  }

  addPollCallbackFunction(func) {
    this.pollCallbackFunctions.add(func);
  }
}
