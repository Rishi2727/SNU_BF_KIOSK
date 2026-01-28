export const parseMapPoint = (mapPoint) => {
  if (!mapPoint || typeof mapPoint !== "string") return [];

  return mapPoint
    .split("$")
    .map((block) => {
      const styles = {};

      block.split(";").forEach((style) => {
        const [key, value] = style.split(":").map((s) => s.trim());
        if (key && value) {
          styles[key] = value; // top, left, right, width, height
        }
      });

      return styles;
    })
    .filter((s) => Object.keys(s).length > 0);
};


export const filterDisplayableSectors = (sectorList) => {
  return (sectorList?.SectorList || sectorList || []).filter(
    sector => sector.ASSIGN_YN === "Y" && sector.MAPPOINT && sector.MAPLABEL
  );
};