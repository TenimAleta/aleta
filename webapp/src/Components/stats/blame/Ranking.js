import { ProfilePic } from "../../pissarra/watchers/UserList";

function Ranking({ ranking, nHores, displayName }) {
    return (
        <div
            style={{
                marginTop: 100,
                paddingBottom: 15,
            }}
        >
            <h2>Membres més actius les últimes {nHores} hores</h2>

            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
            {
                Object.entries(ranking)
                    .sort(([,a],[,b]) => b-a)
                    .map(([author, count], index) => (
                        <div key={index} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            margin: 15,
                            gap: 20,
                        }}>
                            <ProfilePic
                                user={author}
                                width={50}
                                height={50}
                                rounded={false}
                                touchToEnlarge={true}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 'bold', marginBottom: '5px' }}>{displayName(author)}</span>
                                <span>{count} canvis</span>
                            </div>
                        </div>
                    ))
            }
            </div>

        </div>
    )
}

export default Ranking;