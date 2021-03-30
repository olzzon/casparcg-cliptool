//Node Modules:
import os from 'os' // Used to display (log) network addresses on local machine
import osc from 'osc' //Using OSC fork from PieceMeta/osc.js as it has excluded hardware serialport support and thereby is crossplatform

//Types:
import * as DEFAULTS from '../utils/CONSTANTS'

//Modules:
import { CasparCG } from 'casparcg-connection'
import { reduxState, reduxStore } from '../../model/reducers/store'
import { updateMediaFiles } from '../../model/reducers/mediaActions'
import {
    channelSetClip,
    channelSetName,
    channelSetTime,
} from '../../model/reducers/channelsAction'
import { socketServer } from './expressHandler'

//Setup AMCP Connection:
export const ccgConnection = new CasparCG({
    host: DEFAULTS.CCG_HOST,
    port: DEFAULTS.CCG_AMCP_PORT,
    autoConnect: true,
})

const setupOscServer = () => {
    let _this2 = this
    const oscConnection = new osc.UDPPort({
        localAddress: '0.0.0.0',
        localPort: DEFAULTS.DEFAULT_OSC_PORT,
    })

    oscConnection
        .on('ready', () => {
            let ipAddresses = getThisMachineIpAddresses()

            console.log('Listening for OSC over UDP.')
            ipAddresses.forEach((address) => {
                console.log(
                    'OSC Host:',
                    address + ', Port:',
                    oscConnection.options.localPort
                )
            })
        })
        .on('message', (message: any) => {
            let channelIndex = findChannelNumber(message.address) - 1
            let layerIndex = findLayerNumber(message.address) - 1

            if (message.address.includes('/stage/layer')) {
                if (message.address.includes('file/name')) {
                    reduxStore.dispatch(
                        channelSetName(
                            channelIndex,
                            layerIndex,
                            message.address.includes('foreground'),
                            message.args[0]
                        )
                    )
                }
                if (message.address.includes('file/clip')) {
                    reduxStore.dispatch(
                        channelSetClip(channelIndex, layerIndex, [
                            parseFloat(message.args[0]),
                            parseFloat(message.args[1]),
                        ])
                    )
                }
                if (message.address.includes('file/time')) {
                    reduxStore.dispatch(
                        channelSetTime(channelIndex, layerIndex, [
                            parseFloat(message.args[0]),
                            parseFloat(message.args[1]),
                        ])
                    )
                }
                /*
                if (message.address.includes('loop')) {
                    ccgChannel[channelIndex].layer[layerIndex].foreground.loop =
                        message.args[0]
                }
                if (message.address.includes('/paused')) {
                    ccgChannel[channelIndex].layer[
                        layerIndex
                    ].foreground.paused = message.args[0]
                }
*/
            }
        })
        .on('error', (error: any) => {
            console.log('OSC error :', error)
        })

    oscConnection.open()
    console.log(`OSC listening on port 5253`)
}

const getThisMachineIpAddresses = () => {
    let interfaces = os.networkInterfaces()
    let ipAddresses: Array<string> = []
    for (let deviceName in interfaces) {
        let addresses = interfaces[deviceName]
        for (let i = 0; i < addresses.length; i++) {
            let addressInfo = addresses[i]
            if (addressInfo.family === 'IPv4' && !addressInfo.internal) {
                ipAddresses.push(addressInfo.address)
            }
        }
    }
    return ipAddresses
}

const findChannelNumber = (string: string): number => {
    let channel = string.replace('/channel/', '')
    channel = channel.slice(0, channel.indexOf('/'))
    return parseInt(channel)
}

const findLayerNumber = (string: string): number => {
    let channel = string.slice(string.indexOf('layer/') + 6)
    channel = channel.slice(0, channel.indexOf('/'))
    return parseInt(channel)
}

const casparCGconnection = () => {
    //Check CCG Version and initialise OSC server:
    console.log('Checking CasparCG connection')
    ccgConnection
        .version()
        .then((response) => {
            console.log(
                'AMCP connection established to: ',
                DEFAULTS.CCG_HOST,
                ':',
                DEFAULTS.CCG_AMCP_PORT
            )
            console.log('CasparCG Server Version :', response.response.data)
            /*
                    mediaFileWatchSetup(
                        this.configFile.configuration.paths['media-path']._text,
                        this.pubsub
                    )
                }
*/
        })
        .catch((error) => {
            console.log('No connection to CasparCG', error)
        })
    ccgConnection.getCasparCGConfig().then((response) => {
        reduxStore.dispatch({ type: 'SET_CASPARCG_CONFIG', data: response })
    })

    startTimerControlledServices()
}

const startTimerControlledServices = () => {
    //Update of timeleft is set to a default 40ms (same as 25FPS)
    setInterval(() => {
        socketServer.emit('OK', 1)
        console.log(
            '0: ',
            reduxState.channels[0][0].layer[9].foreground.file.time[0],
            ' 1:',
            reduxState.channels[0][0].layer[9].foreground.file.time[1]
        )
    }, 400)

    //Check media files on server:
    let waitingForResponse: boolean = false
    setInterval(() => {
        if (!waitingForResponse) {
            waitingForResponse = true
            ccgConnection
                .cls()
                .then((payload) => {
                    reduxStore.dispatch(updateMediaFiles(payload.response.data))
                    waitingForResponse = false
                })
                .catch((error) => {
                    console.log('Server not connected :', error)
                    // global.graphQlServer.setServerOnline(false)
                })
        }
    }, 3000)
}

export const casparCgClient = () => {
    casparCGconnection()
    setupOscServer()
}
