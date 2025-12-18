export const parseMapPoint = (mapPoint) => {
  if (!mapPoint) return [];

  // split multiple layouts by $
  return mapPoint.split("$").map(block => {
    const styles = {};
    block.split(";").forEach(style => {
      const [key, value] = style.split(":").map(s => s.trim());
      if (key && value) {
        styles[key] = value;
      }
    });
    return styles;
  }).filter(s => Object.keys(s).length > 0);
};


export const filterDisplayableSectors = (sectorList) => {
  return (sectorList?.SectorList || sectorList || []).filter(
    sector => sector.ASSIGN_YN === "Y" && sector.MAPPOINT && sector.MAPLABEL
  );
};