import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';

type Props={name:string;children:React.ReactNode};
type State={error:string|null};

export class ModuleBoundary extends React.Component<Props,State>{
  state:State={error:null};
  static getDerivedStateFromError(error:unknown):State{
    return{error:error instanceof Error?error.message:String(error)};
  }
  componentDidCatch(error:unknown,info:React.ErrorInfo){
    console.error(`[NEBRIN ONE] ${this.props.name} crashed`,error,info.componentStack);
  }
  reset=()=>this.setState({error:null});
  render(){
    if(this.state.error){
      return <View style={s.box}>
        <Text style={s.title}>{this.props.name} temporarily unavailable</Text>
        <Text style={s.message}>{this.state.error}</Text>
        <Pressable onPress={this.reset} style={s.btn}><Text style={s.bt}>Retry module</Text></Pressable>
      </View>;
    }
    return this.props.children;
  }
}

const s=StyleSheet.create({
  box:{backgroundColor:'#fff7ed',borderWidth:1,borderColor:'#fed7aa',borderRadius:14,padding:14,marginBottom:14},
  title:{fontWeight:'900',color:'#9a3412',marginBottom:6},
  message:{color:'#7c2d12',fontSize:12,marginBottom:10},
  btn:{alignSelf:'flex-start',backgroundColor:'#9a3412',paddingHorizontal:12,paddingVertical:8,borderRadius:9},
  bt:{color:'#fff',fontWeight:'800'}
});
