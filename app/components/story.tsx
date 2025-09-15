import { View , Text, TouchableOpacity} from "react-native";
import { styles } from "@/assets/theme/styles";
import { StyleSheet } from "react-native";
import { Image } from "react-native";
import { StoryProps } from "@/lib/database.module";
import { PlusCircle } from 'phosphor-react-native';
export default function Story({image}: StoryProps) {
  return(
    <View style={style.container}>
        <Image style={style.image} source={{uri: image}} />
    </View>
    
  )
}

export function MyStory({image}: StoryProps){
    return(
        <TouchableOpacity>
            <View style={[style.container, {borderColor: '#a9a9a9ff'}]}>
                <Image style={style.image} source={{uri: image}} />
            </View>
            <PlusCircle size={24} color="#1D9BF0" weight="fill" style={style.plusIcon} /> 
        </TouchableOpacity>
    )
}

const style = StyleSheet.create({
    container: {
        width: 80,
        height: 80,
        backgroundColor: 'transparent',
        borderRadius: 40,
        marginHorizontal: 3,
        borderWidth: 3,
        borderColor: '#1D9BF0',
        padding: 3,
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: 100,
    }, 
    plusIcon: {
        position: 'absolute',
        bottom: 1,
        left: 0,
        backgroundColor: 'white',
        borderRadius: 12,
    }
})