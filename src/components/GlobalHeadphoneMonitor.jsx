import { useDispatch } from "react-redux"
import { useNavigateContext } from "../context/NavigateContext";
import { useHeadphoneGuard } from "../hooks/useHeadphoneGuard";
import { logout } from "../redux/slice/authSlice";
import { disableNextFocus, triggerHeadphoneFocus } from "../redux/slice/headphoneSlice";


const GlobalHeadphoneMonitor = () => {
    const dispatch = useDispatch();
    const navigate = useNavigateContext()

useHeadphoneGuard({
    onFocusContent:()=>{
        dispatch(logout())
        dispatch(disableNextFocus());
        navigate('/')
    }
})


  return null;
}

export default GlobalHeadphoneMonitor