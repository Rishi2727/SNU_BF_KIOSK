import { useDispatch } from "react-redux"
import { useNavigateContext } from "../context/NavigateContext";
import { useHeadphoneGuard } from "../hooks/useHeadphoneGuard";
import { clearLoginSession } from "../utils/clearLoginSession";
import { clearUserInfo } from "../redux/slice/userInfo";
import { disableNextFocus, triggerHeadphoneFocus } from "../redux/slice/headphoneSlice";


const GlobalHeadphoneMonitor = () => {
    const dispatch = useDispatch();
    const navigate = useNavigateContext()

useHeadphoneGuard({
    onFocusContent:()=>{
        clearLoginSession();
        dispatch(clearUserInfo())
        dispatch(disableNextFocus());
        navigate('/')
    }
})


  return null;
}

export default GlobalHeadphoneMonitor