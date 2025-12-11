import logo from "../../../assets/images/logo.png";
import LibraryCard from "./LibraryCard";

export const libraries = [
  { id: 1, title: "6F" , floor: "6" , floorno : "16"},
  { id: 2, title: "7F" , floor: "7" , floorno : "17"},
  { id: 3, title: "8F" , floor: "8" , floorno : "18" },
];

const MainSection = ({ openKeyboard }) => {
  const handleCardClick = (floor) => {
    openKeyboard(floor);   // ⭐ pass floor number back
  };

  return (
    <div className="relative z-10 flex justify-end items-center h-full mr-7">
      <div className="w-[55%] flex flex-col items-center">

        <img src={logo} alt="logo" className="w-[50%] mb-12 ml-[15%]" />

        <div className="w-full p-12 rounded-3xl bg-[#9A7D4C] border border-white/30 backdrop-blur-xl">
          <h2 className="text-[32px] font-semibold mb-10">
            원하는 라이브러리를 선택하십시오
          </h2>

          <div className="flex justify-between">
            {libraries.map((lib) => (
              <LibraryCard
                key={lib.id}
                {...lib}
                availableCount={30}
                totalCount={217}
                onClick={() => handleCardClick(lib.title)} // ⭐ Pass floor
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainSection;


