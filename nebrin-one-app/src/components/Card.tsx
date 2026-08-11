import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
export function Card({title,children}:{title?:string;children:ReactNode}){return <View style={styles.card}>{title?<Text style={styles.title}>{title}</Text>:null}{children}</View>}
const styles=StyleSheet.create({card:{backgroundColor:'#fff',borderRadius:18,padding:18,marginBottom:14,shadowColor:'#000',shadowOpacity:.06,shadowRadius:12,shadowOffset:{width:0,height:5},elevation:2},title:{fontWeight:'800',fontSize:17,marginBottom:10,color:'#14213d'}});
