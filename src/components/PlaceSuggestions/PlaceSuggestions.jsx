import { SIMILAR_PLACES } from "../../data/visitHistory";
import styles from "./PlaceSuggestions.module.css";

export default function PlaceSuggestions({ historyMatches, smartMatch, onSelect, onDismiss }) {
  const nearbyPlaces = smartMatch
    ? (SIMILAR_PLACES[smartMatch.search] || []).filter(
        (p) => !historyMatches.some((h) => h.name === p.name)
      )
    : [];

  if (!historyMatches.length && !nearbyPlaces.length) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>🤖</div>
        <div className={styles.headerTitle}>AI 장소 추천</div>
        <button className={styles.dismissBtn} onClick={onDismiss}>✕</button>
      </div>

      {historyMatches.length > 0 && (
        <>
          <div className={styles.historyLabel}>🕐 전에 가던 곳</div>
          {historyMatches.map((place, i) => (
            <button
              key={"h" + i}
              className={styles.historyPlace}
              onClick={() => onSelect(place, true)}
            >
              <div className={styles.placeIconStar}>⭐</div>
              <div className={styles.placeInfo}>
                <div className={styles.historyName}>{place.name}</div>
                <div className={styles.placeAddress}>{place.address}</div>
                <div><span className={styles.visitBadge}>방문 {place.visits}회</span></div>
              </div>
              <div className={styles.historyDist}>{place.dist}</div>
            </button>
          ))}
        </>
      )}

      {nearbyPlaces.length > 0 && (
        <>
          <div className={styles.nearbyLabel} style={{ marginTop: historyMatches.length > 0 ? 12 : 0 }}>
            📍 주변 다른 곳
          </div>
          {nearbyPlaces.map((place, i) => (
            <button
              key={"n" + i}
              className={styles.nearbyPlace}
              onClick={() => onSelect({ ...place, prep: smartMatch?.prep }, false)}
            >
              <div className={styles.placeIconPin}>📍</div>
              <div className={styles.placeInfo}>
                <div className={styles.nearbyName}>{place.name}</div>
                <div className={styles.placeAddress}>{place.address}</div>
              </div>
              <div className={styles.nearbyDist}>{place.dist}</div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
