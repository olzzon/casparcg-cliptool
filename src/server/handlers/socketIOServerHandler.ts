import { reduxState, reduxStore } from '../../model/reducers/store'
import { logger } from '../utils/logger'
import * as IO from '../../model/SocketIoConstants'

import { socketServer } from './expressHandler'
import {
    mixMedia,
    playMedia,
    loadMedia,
    playOverlay,
    stopOverlay,
    stopMedia,
} from '../utils/CcgLoadPlay'
import {
    setLoop,
    setMix,
    setManualStart,
    updateMediaFiles,
    updateThumbFileList,
    setWeb,
} from '../../model/reducers/mediaActions'
import { setGenerics } from '../../model/reducers/settingsAction'
import { IGenericSettings } from '../../model/reducers/settingsReducer'
import { saveSettings } from '../utils/SettingsStorage'
import { IOutput } from '../../model/reducers/mediaReducer'
import { assignThumbNailListToOutputs } from './CasparCgHandler'

export function socketIoHandlers(socket: any) {
    logger.info('SETTING UP SOCKET IO MAIN HANDLERS')

    socketServer.emit(IO.SETTINGS_UPDATE, reduxState.settings[0])
    initializeClient()

    socket
        .on(IO.GET_SETTINGS, () => {
            socketServer.emit(IO.SETTINGS_UPDATE, reduxState.settings[0])
        })
        .on(IO.PGM_PLAY, (channelIndex: number, fileName: string) => {
            if (!reduxState.media[0].output[channelIndex].mixState) {
                playMedia(channelIndex, 9, fileName)
            } else {
                mixMedia(channelIndex, 9, fileName)
            }
            logger.info(
                'Play out :' + fileName + ' On ChannelIndex : ' + channelIndex
            )
        })
        .on(IO.PGM_LOAD, (channelIndex: number, fileName: string) => {
            loadMedia(channelIndex, 9, fileName)
            logger.info(
                'Load Media :' + fileName + ' On ChannelIndex : ' + channelIndex
            )
        })
        .on(IO.PGM_STOP, (channelIndex: number) => {
            stopMedia(channelIndex, 9)
            logger.info('Stop Media On ChannelIndex : ' + channelIndex)
        })

        .on(IO.SET_LOOP_STATE, (channelIndex: number, state: boolean) => {
            reduxStore.dispatch(setLoop(channelIndex, state))
            socketServer.emit(
                IO.LOOP_STATEUPDATE,
                channelIndex,
                reduxState.media[0].output[channelIndex].loopState
            )
        })
        .on(
            IO.SET_MANUAL_START_STATE,
            (channelIndex: number, state: boolean) => {
                reduxStore.dispatch(setManualStart(channelIndex, state))
                socketServer.emit(
                    IO.MANUAL_START_STATE_UPDATE,
                    channelIndex,
                    reduxState.media[0].output[channelIndex].manualstartState
                )
            }
        )
        .on(IO.SET_MIX_STATE, (channelIndex: number, state: boolean) => {
            reduxStore.dispatch(setMix(channelIndex, state))
            socketServer.emit(
                IO.MIX_STATE_UPDATE,
                channelIndex,
                reduxState.media[0].output[channelIndex].mixState
            )
        })
        .on(IO.SET_WEB_STATE, (channelIndex: number, state: boolean) => {
            reduxStore.dispatch(setWeb(channelIndex, state))
            socketServer.emit(
                IO.WEB_STATE_UPDATE,
                channelIndex,
                reduxState.media[0].output[channelIndex].webState
            )
            if (reduxState.media[0].output[channelIndex].webState) {
                playOverlay(
                    channelIndex,
                    10,
                    reduxState.settings[0].generics.webURL?.[channelIndex]
                )
                logger.info(
                    'Playing Overlay :' +
                        reduxState.settings[0].generics.webURL?.[channelIndex] +
                        ' On ChannelIndex : ' +
                        channelIndex
                )
            } else {
                stopOverlay(channelIndex, 10)
            }
        })
        .on(IO.SET_GENERICS, (generics: IGenericSettings) => {
            logger.info('Updating and storing Generic Settings Serverside')
            reduxStore.dispatch(setGenerics(generics))
            saveSettings()
            socketServer.emit(IO.SETTINGS_UPDATE, reduxState.settings[0])
            cleanUpMediaFiles()
        })
        .on(IO.RESTART_SERVER, () => {
            process.exit(0)
        })
}

export const initializeClient = () => {
    socketServer.emit(IO.TAB_DATA_UPDATE, reduxState.settings[0].tabData)
    let timeTallyData: IO.ITimeTallyPayload[] = []
    reduxState.media[0].output.forEach(
        (output: IOutput, channelIndex: number) => {
            timeTallyData[channelIndex] = {
                time: output.time,
                tally: output.tallyFile,
            }

            socketServer.emit(IO.TIME_TALLY_UPDATE, timeTallyData)
            socketServer.emit(
                IO.LOOP_STATEUPDATE,
                channelIndex,
                output.loopState
            )
            socketServer.emit(
                IO.MIX_STATE_UPDATE,
                channelIndex,
                output.mixState
            )
            socketServer.emit(
                IO.MANUAL_START_STATE_UPDATE,
                channelIndex,
                output.manualstartState
            )
            socketServer.emit(
                IO.THUMB_UPDATE,
                channelIndex,
                reduxState.media[0].output[channelIndex].thumbnailList
            )
            socketServer.emit(
                IO.MEDIA_UPDATE,
                channelIndex,
                reduxState.media[0].output[channelIndex].mediaFiles
            )
        }
    )
    socketServer.emit(IO.TIME_TALLY_UPDATE, timeTallyData)
}

const cleanUpMediaFiles = () => {
    reduxState.media[0].output.forEach(
        (output: IOutput, channelIndex: number) => {
            reduxStore.dispatch(updateMediaFiles(channelIndex, []))
            reduxStore.dispatch(updateThumbFileList(channelIndex, []))
            assignThumbNailListToOutputs()
        }
    )
}
