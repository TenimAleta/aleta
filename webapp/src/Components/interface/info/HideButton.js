import ShortSwitchTargets from './ShortSwitchTargets';

function HideButton({ targets, hash, socket, userInfo }) {
    return (
        <div>
            <ShortSwitchTargets
                event={{
                    targets: targets,
                    hash: hash
                }}
                socket={socket}
                userInfo={userInfo}
            />
        </div>
    )
}

export default HideButton;