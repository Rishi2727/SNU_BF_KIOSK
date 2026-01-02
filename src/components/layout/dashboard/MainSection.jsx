import { useNavigate } from "react-router-dom";
import logo from "../../../assets/images/logo.png";
import LibraryCard from "./LibraryCard";
import { getSectorList } from "../../../services/api";
const floors = [
  { id: 16, title: "6F", floor: "6", floorno: "16", total: 230, occupied: 5 },
  { id: 17, title: "7F", floor: "7", floorno: "17", total: 230, occupied: 10 },
  { id: 18, title: "8F", floor: "8", floorno: "18", total: 230, occupied: 15 },
];

const MainSection = ({ openKeyboard, isAuthenticated }) => {
  const navigate = useNavigate();

  const handleCardClick = async (fl) => {
    // 🔹 Check authentication first
    if (!isAuthenticated) {
      // Store the floor info to use after login
      openKeyboard(fl.title);
      return; // Stop here, don't call API yet
    }

    // 🔹 User is authenticated, proceed with API call
    try {
      const sectorList = await getSectorList({
        floor: fl.floor,
        floorno: fl.floorno,
      });

      console.log("Sector List:", sectorList);

      // 🔹 Navigate after success
      navigate(`/floor/${fl.title}`, {
        state: {
          sectorList,
          floorInfo: fl,
        },
      });
    } catch (error) {
      console.error("Sector API failed", error);
    }
  };

  return (
    <div className="relative z-10 flex justify-end items-center h-full mr-7 -mt-25">

      <div className="w-[55%] flex flex-col items-center">
        <img src={logo} alt="logo" className="w-[50%] mb-12 ml-[15%]" />

        <div className="w-full p-12 rounded-3xl bg-[#9A7D4C] border border-white/30 backdrop-blur-xl">
          <h2 className="text-[32px] font-semibold mb-10">
            원하는 라이브러리를 선택하십시오
          </h2>

          <div className="flex justify-between">
            {floors.map((fl) => (
              <LibraryCard
                key={fl.id}
                {...fl}
                availableCount={fl.occupied}
                totalCount={fl.total}
                onClick={() => handleCardClick(fl)} // ✅ pass full object
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainSection;



