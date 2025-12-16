export const parseMapPoint = (mapPoint) => {
  if (!mapPoint) return null;
  
  const styles = {};
  mapPoint.split(';').forEach(style => {
    const [key, value] = style.split(':').map(s => s.trim());
    if (key && value) {
      styles[key] = value;
    }
  });
  return styles;
};

export const filterDisplayableSectors = (sectorList) => {
  return (sectorList?.SectorList || sectorList || []).filter(
    sector => sector.ASSIGN_YN === "Y" && sector.MAPPOINT && sector.MAPLABEL
  );
};