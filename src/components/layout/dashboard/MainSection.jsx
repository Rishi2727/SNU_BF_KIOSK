import logo from '../../../assets/images/logo.png';
import LibraryCard from './LibraryCard';
export const libraries = [
  { id: 1, title: '6F' },
  { id: 2, title: '7F' },
  { id: 3, title: '8F' },
];
const MainSection = () => {
  return (
    <div className="relative z-10 flex h-full">
      <div className="w-[65%] flex flex-col absolute top-[15%] left-[40%] items-center">

        {/* Logo */}
        <img
          src={logo}
          alt="logo"
          className="w-[45%] mt-10 mb-12 ml-[20%]"
        />

        {/* Content Card */}
        <div
          className="
            w-[80%] p-12 rounded-3xl
            bg-[#9A7D4C] backdrop-blur-xl
            border border-white/30
          "
        >
          <h2 className="text-[32px] font-semibold mb-13">
            원하는 라이브러리를 선택하십시오
          </h2>

          <div className="flex w-full ">
            {libraries.map((lib) => (
              <LibraryCard key={lib.id} {...lib}
                availableCount={30}
                totalCount={217}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainSection;
