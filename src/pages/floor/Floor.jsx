import Header from "../../components/layout/header/Header"
import BgMainImage from "../../assets/images/BgMain.jpg";

const Floor = () => {
  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      <img src={BgMainImage} className="absolute inset-0 h-full w-full object-cover" />

      <Header />
    </div>
  )
}

export default Floor