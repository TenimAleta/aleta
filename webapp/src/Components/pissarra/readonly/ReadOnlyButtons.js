import BotoBuscar from "./BotoBuscar";
import BotoPestanyaUp from "../controller/botons/BotoPestanyaUp";
import BotoPestanyaDown from "../controller/botons/BotoPestanyaDown";

function ReadOnlyButtons({ caixaSelected, panzoom, castellersInfo, posicions, setCaixaSelected, tabs, pestanya, setPestanya }) {
    return (
        <div
            style={{
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 99999999,
                    gap: 10,
                    position: 'fixed',
                    bottom: 25,
                    left: 25,
                }}
            >
                <BotoPestanyaUp
                    tabs={tabs}
                    pestanya={pestanya}
                    setPestanya={setPestanya}
                    readonly={true}
                />

                <BotoPestanyaDown
                    tabs={tabs}
                    pestanya={pestanya}
                    setPestanya={setPestanya}
                    readonly={true}
                />
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    zIndex: 99999999,
                    position: 'fixed',
                    bottom: 25,
                    right: 25,
                }}
            >
                <BotoBuscar
                    setCaixaSelected={setCaixaSelected}
                    posicions={posicions}
                    castellersInfo={castellersInfo}
                    panzoom={panzoom}
                    caixaSelected={caixaSelected}
                />
            </div>
        </div>
    )
}

export default ReadOnlyButtons;