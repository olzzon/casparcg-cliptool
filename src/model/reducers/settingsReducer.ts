const defaultSettingsReducerState = () => {
    let defaultState = [
        {
            ipAddress: 'localhost',
            port: '5250',
            selectView: 0,
            disableDragNDrop: false,
            disableOverlay: false,
            tabData: [],
        },
    ]
    for (let i = 0; i < 4; i++) {
        defaultState[0].tabData.push({
            key: i + 1,
            title: 'SCREEN ' + (i + 1),
            subFolder: '',
            loop: false,
            autoPlay: false,
            overlayFolder: '',
            dataFolder: '',
            wipe: '',
            wipeOffset: 0.0,
        })
    }
    return defaultState
}

export const settings = (state = defaultSettingsReducerState(), action) => {
    let { ...nextState } = state

    switch (action.type) {
        case 'UPDATE_SETTINGS':
            let { tabData } = action.data
            nextState[0].ipAddress = action.data.ipAddress
            nextState[0].port = action.data.port
            nextState[0].selectView = action.data.selectView || 0
            nextState[0].disableDragNDrop =
                action.data.disableDragNDrop || false
            nextState[0].disableOverlay = action.data.disableOverlay || false
            nextState[0].tabData.forEach((item, index) => {
                item.title = tabData[index].title || ''
                item.subFolder = tabData[index].subFolder || ''
                item.loop = tabData[index].loop || false
                item.autoPlay = tabData[index].autoPlay || false
                item.overlayFolder = tabData[index].overlayFolder || ''
                item.dataFolder = tabData[index].dataFolder || ''
                item.wipe = tabData[index].wipe || ''
                item.wipeOffset = tabData[index].wipeOffset || 0.0
            })
            return nextState
        case 'LOOP_STATUS':
            nextState[0].tabData[action.data].loop = !nextState[0].tabData[
                action.data
            ].loop
            return nextState
        case 'TOGGLE_VIEW':
            let nextView = nextState[0].selectView + 1
            if (nextView > 2) {
                nextView = 0
            }
            nextState[0].selectView = nextView
            return nextState
        case 'LOOP_STATUS':
            nextState[0].tabData[action.data].disableDragNDrop = !nextState[0]
                .tabData[action.data].disableDragNDrop
            return nextState
        case 'AUTOPLAY_STATUS':
            nextState[0].tabData[action.data].autoPlay = !nextState[0].tabData[
                action.data
            ].autoPlay
            return nextState
        default:
            return nextState
    }
}
